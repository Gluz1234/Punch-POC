import { Injectable, BadRequestException } from '@nestjs/common';
import neo4j from 'neo4j-driver';
import { Neo4jService } from '../infrastructure/neo4j/neo4j.service';
import { ENTITY_CONFIGS, EntityConfig, getAllEntities } from '../config/entity-config';

export interface FullTextSearchResult {
  entity: string;
  id: string;
  score: number;
  data: Record<string, any>;
  highlights?: Record<string, string>;
  matches?: SearchMatchExplanation[];
}

export interface FullTextSearchConfig {
  entity: string;
  query: string;
  fields?: string[];
  tenantId?: string;
  limit?: number;
}

export interface SearchFieldQuery {
  field: string;
  query: string;
  operator?: SearchOperator;
  boost?: number;
}

export interface SearchRangeFilter {
  field: string;
  gt?: string | number;
  gte?: string | number;
  lt?: string | number;
  lte?: string | number;
}

export interface SearchRelationshipFilter {
  type?: string;
  direction?: 'OUTGOING' | 'INCOMING' | 'BOTH';
  entity?: string;
  targetFilters?: Record<string, unknown>;
  relationshipFilters?: Record<string, unknown>;
  query?: string;
  fields?: string[];
}

export interface SearchFacetRequest {
  field: string;
  limit?: number;
}

export interface SearchAggregationRequest {
  operation: 'count' | 'countDistinct' | 'min' | 'max' | 'avg' | 'sum';
  field?: string;
  name?: string;
}

export interface AdvancedSearchRequest {
  q?: string;
  fields?: string[];
  fieldQueries?: SearchFieldQuery[];
  ranges?: SearchRangeFilter[];
  relationships?: SearchRelationshipFilter[];
  facets?: SearchFacetRequest[];
  aggregations?: SearchAggregationRequest[];
  explain?: boolean;
  tenantId?: string;
  limit?: number;
}

export interface AdvancedSearchResponse {
  results: FullTextSearchResult[];
  facets?: Record<string, Array<{ value: unknown; count: number }>>;
  aggregations?: Record<string, unknown>;
  meta: {
    entity: string;
    resultCount: number;
    requestedLimit: number;
    explain: boolean;
  };
}

export interface AutocompleteRequest {
  query: string;
  field?: string;
  fields?: string[];
  tenantId?: string;
  limit?: number;
}

export interface AutocompleteResult {
  entity: string;
  field: string;
  value: string;
  score: number;
}

export interface SearchMatchExplanation {
  source: 'root' | 'field' | 'range' | 'relationship';
  field?: string;
  operator: string;
  query?: string;
  matchedValue?: string;
  scoreContribution?: number;
  relationshipType?: string;
  targetEntity?: string;
  description?: string;
}

type QueryType = 'contains' | 'prefix' | 'fuzzy' | 'phrase' | 'and' | 'or' | 'exact';
type SearchOperator = 'contains' | 'prefix' | 'fuzzy' | 'phrase' | 'exact';

interface ParsedQuery {
  type: QueryType;
  terms: string[];
  fuzzyThreshold?: number;
}

interface SearchPlan {
  whereClauses: string[];
  scoreExpressions: string[];
  params: Record<string, any>;
}

@Injectable()
export class FullTextSearchService {
  private apocAvailable: boolean | null = null;

  constructor(private readonly neo4j: Neo4jService) {}

  async initializeIndexes() {
    console.log('\nInitializing search engine...');
    await this.checkApocAvailability();
    const mode = this.apocAvailable ? 'APOC-enhanced' : 'Cypher-only';
    console.log(`  Search ready (${mode})`);
    console.log('  Supports: generic text search, field filters, ranges, relationships, facets, aggregations, autocomplete\n');
  }

  async search(config: FullTextSearchConfig): Promise<FullTextSearchResult[]> {
    const response = await this.searchAdvanced(config.entity, {
      q: config.query,
      fields: config.fields,
      tenantId: config.tenantId,
      limit: config.limit,
    });
    return response.results;
  }

  async searchAdvanced(
    entity: string,
    request: AdvancedSearchRequest,
  ): Promise<AdvancedSearchResponse> {
    const entityConfig = this.resolveEntityConfig(entity);
    await this.ensureSearchCapabilities();

    const limit = this.normalizeLimit(request.limit ?? 50);
    const plan = this.buildSearchPlan(entityConfig, request);
    const { query, params } = this.buildResultsQuery(entityConfig, plan, limit);
    const records = await this.neo4j.runQuery(query, params);

    const results = records.map(record => {
      const data = this.neo4j.toPlainObject(record.get('n').properties);
      const baseResult: FullTextSearchResult = {
        entity: entityConfig.key,
        id: data[entityConfig.idField],
        score: this.normalizeValue(record.get('score')) ?? 0,
        data,
      };

      if (request.explain) {
        const decorations = this.buildResultDecorations(entityConfig, data, request);
        if (decorations.highlights) {
          baseResult.highlights = decorations.highlights;
        }
        if (decorations.matches) {
          baseResult.matches = decorations.matches;
        }
      }

      return baseResult;
    });

    const [facets, aggregations] = await Promise.all([
      this.loadFacets(entityConfig, request, plan),
      this.loadAggregations(entityConfig, request, plan),
    ]);

    return {
      results,
      facets,
      aggregations,
      meta: {
        entity: entityConfig.key,
        resultCount: results.length,
        requestedLimit: limit,
        explain: Boolean(request.explain),
      },
    };
  }

  async autocomplete(
    entity: string,
    request: AutocompleteRequest,
  ): Promise<AutocompleteResult[]> {
    const entityConfig = this.resolveEntityConfig(entity);
    const queryText = request.query?.trim();

    if (!queryText) {
      throw new BadRequestException('Autocomplete query is required');
    }

    const limit = this.normalizeLimit(request.limit ?? 10, 100);
    const requestedFields = request.field ? [request.field] : request.fields;
    const fields = this.resolveSearchFields(entityConfig, requestedFields);

    if (fields.length === 0) {
      return [];
    }

    const params: Record<string, any> = {
      term: queryText,
      limit: neo4j.int(limit),
    };

    const subqueries = fields.map((field, index) => {
      const fieldRef = this.fieldRef('n', field);
      const tenantClause = request.tenantId
        ? `AND ${this.buildTenantScopeClause('n', `autocompleteTenant${index}`, params, request.tenantId)}`
        : '';

      return `
        MATCH (n:${this.labelRef(entityConfig.label)})
        WHERE ${fieldRef} IS NOT NULL
          AND toLower(toString(${fieldRef})) STARTS WITH toLower($term)
          ${tenantClause}
        RETURN '${field}' AS field,
               toString(${fieldRef}) AS value,
               CASE
                 WHEN toLower(toString(${fieldRef})) = toLower($term) THEN 3
                 WHEN toLower(toString(${fieldRef})) STARTS WITH toLower($term) THEN 2
                 ELSE 1
               END AS score
      `;
    });

    const query = `
      CALL {
        ${subqueries.join('\n        UNION\n')}
      }
      RETURN field, value, max(score) AS score
      ORDER BY score DESC, size(value) ASC, value ASC
      LIMIT $limit
    `;

    const records = await this.neo4j.runQuery(query, params);
    return records.map(record => ({
      entity: entityConfig.key,
      field: record.get('field'),
      value: record.get('value'),
      score: this.normalizeValue(record.get('score')) ?? 0,
    }));
  }

  async searchPersons(query: string, tenantId?: string, limit = 50) {
    return this.search({ entity: 'person', query, tenantId, limit });
  }

  async searchOrganizations(query: string, limit = 50) {
    return this.search({ entity: 'organization', query, limit });
  }

  async searchSkills(query: string, limit = 50) {
    return this.search({ entity: 'skill', query, limit });
  }

  async searchCourses(query: string, limit = 50) {
    return this.search({ entity: 'course', query, limit });
  }

  private async ensureSearchCapabilities() {
    if (this.apocAvailable === null) {
      await this.checkApocAvailability();
    }
  }

  private buildSearchPlan(
    entityConfig: EntityConfig,
    request: AdvancedSearchRequest,
  ): SearchPlan {
    const plan: SearchPlan = {
      whereClauses: [],
      scoreExpressions: [],
      params: {},
    };

    if (request.tenantId) {
      plan.whereClauses.push(
        this.buildTenantScopeClause('n', 'rootTenant', plan.params, request.tenantId),
      );
    }

    if (request.q?.trim()) {
      const parsed = this.parseQuery(request.q);
      const fields = this.resolveSearchFields(entityConfig, request.fields);
      const condition = this.buildParsedCondition('n', fields, parsed, 'root', plan.params);
      plan.whereClauses.push(condition.where);
      plan.scoreExpressions.push(condition.score);
    }

    for (const [index, fieldQuery] of (request.fieldQueries ?? []).entries()) {
      const field = this.validateField(entityConfig, fieldQuery.field);
      const operator = fieldQuery.operator;
      const parsed = operator
        ? this.parseOperatorQuery(fieldQuery.query, operator)
        : this.parseQuery(fieldQuery.query);
      const boost = this.normalizeBoost(fieldQuery.boost);
      const condition = this.buildParsedCondition(
        'n',
        [field],
        parsed,
        `field${index}`,
        plan.params,
        boost,
      );

      plan.whereClauses.push(condition.where);
      plan.scoreExpressions.push(condition.score);
    }

    for (const [index, range] of (request.ranges ?? []).entries()) {
      plan.whereClauses.push(this.buildRangeClause(entityConfig, range, index, plan.params));
    }

    for (const [index, relationship] of (request.relationships ?? []).entries()) {
      plan.whereClauses.push(
        this.buildRelationshipClause(entityConfig, relationship, index, request.tenantId, plan.params),
      );
    }

    return plan;
  }

  private buildResultsQuery(
    entityConfig: EntityConfig,
    plan: SearchPlan,
    limit: number,
  ): { query: string; params: Record<string, any> } {
    const params = {
      ...plan.params,
      limit: neo4j.int(limit),
    };
    const whereBlock = this.buildWhereBlock(plan.whereClauses);
    const scoreExpression = plan.scoreExpressions.length
      ? plan.scoreExpressions.join(' + ')
      : '0';
    const idFieldRef = this.fieldRef('n', entityConfig.idField);

    return {
      query: `
        MATCH (n:${this.labelRef(entityConfig.label)})
        ${whereBlock}
        WITH n, (${scoreExpression}) AS score
        RETURN n, score, labels(n) AS labels
        ORDER BY score DESC, toString(${idFieldRef}) ASC
        LIMIT $limit
      `,
      params,
    };
  }

  private async loadFacets(
    entityConfig: EntityConfig,
    request: AdvancedSearchRequest,
    plan: SearchPlan,
  ): Promise<Record<string, Array<{ value: unknown; count: number }>> | undefined> {
    if (!request.facets?.length) {
      return undefined;
    }

    const facetResults = await Promise.all(
      request.facets.map(async (facet, index) => {
        const field = this.validateField(entityConfig, facet.field);
        const query = `
          MATCH (n:${this.labelRef(entityConfig.label)})
          ${this.buildWhereBlock(plan.whereClauses)}
          WITH ${this.fieldRef('n', field)} AS value
          WHERE value IS NOT NULL
          RETURN value, count(*) AS count
          ORDER BY count DESC, toString(value) ASC
          LIMIT $facetLimit${index}
        `;

        const records = await this.neo4j.runQuery(query, {
          ...plan.params,
          [`facetLimit${index}`]: neo4j.int(this.normalizeLimit(facet.limit ?? 10, 100)),
        });

        return [
          field,
          records.map(record => ({
            value: this.normalizeValue(record.get('value')),
            count: this.normalizeValue(record.get('count')) ?? 0,
          })),
        ] as const;
      }),
    );

    return Object.fromEntries(facetResults);
  }

  private async loadAggregations(
    entityConfig: EntityConfig,
    request: AdvancedSearchRequest,
    plan: SearchPlan,
  ): Promise<Record<string, unknown> | undefined> {
    if (!request.aggregations?.length) {
      return undefined;
    }

    const expressions: string[] = [];
    const aliases: string[] = [];

    request.aggregations.forEach((aggregation, index) => {
      const alias = `agg${index}`;
      aliases.push(alias);
      expressions.push(`${this.buildAggregationExpression(entityConfig, aggregation)} AS ${alias}`);
    });

    const query = `
      MATCH (n:${this.labelRef(entityConfig.label)})
      ${this.buildWhereBlock(plan.whereClauses)}
      RETURN ${expressions.join(', ')}
    `;

    const records = await this.neo4j.runQuery(query, plan.params);
    const record = records[0];

    if (!record) {
      return undefined;
    }

    const output: Record<string, unknown> = {};
    request.aggregations.forEach((aggregation, index) => {
      const alias = aliases[index];
      const key = aggregation.name || this.defaultAggregationName(aggregation, index);
      output[key] = this.normalizeValue(record.get(alias));
    });

    return output;
  }

  private parseQuery(raw: string): ParsedQuery {
    const trimmed = raw.trim();

    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 2) {
      return { type: 'phrase', terms: [trimmed.slice(1, -1)] };
    }

    if (/\bAND\b/i.test(trimmed)) {
      return {
        type: 'and',
        terms: trimmed.split(/\s+AND\s+/i).map(term => term.trim()).filter(Boolean),
      };
    }

    if (/\bOR\b/i.test(trimmed)) {
      return {
        type: 'or',
        terms: trimmed.split(/\s+OR\s+/i).map(term => term.trim()).filter(Boolean),
      };
    }

    if (/^[^\s]+~(\d+\.?\d*)?$/.test(trimmed)) {
      const match = trimmed.match(/^([^\s]+?)~(\d+\.?\d*)?$/);
      const threshold = match?.[2] ? parseFloat(match[2]) : 0.6;
      return {
        type: 'fuzzy',
        terms: [match?.[1] ?? trimmed],
        fuzzyThreshold: Math.min(Math.max(threshold, 0.1), 0.99),
      };
    }

    if (trimmed.endsWith('*') && !trimmed.includes(' ')) {
      return { type: 'prefix', terms: [trimmed.slice(0, -1)] };
    }

    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
      return { type: 'and', terms: words };
    }

    return { type: 'contains', terms: [trimmed] };
  }

  private parseOperatorQuery(query: string, operator: SearchOperator): ParsedQuery {
    const normalized = query.trim();
    switch (operator) {
      case 'contains':
        return { type: 'contains', terms: [normalized] };
      case 'prefix': {
        const prefix = normalized.endsWith('*')
          ? normalized.slice(0, -1)
          : normalized;
        return { type: 'prefix', terms: [prefix] };
      }
      case 'fuzzy': {
        // Accept "john", "john~", or "john~0.8"
        const fuzzySource = normalized.includes('~')
          ? normalized
          : `${normalized}~`;
        const parsed = this.parseQuery(fuzzySource);
        if (parsed.type === 'fuzzy') {
          return parsed;
        }
        return { type: 'fuzzy', terms: [normalized], fuzzyThreshold: 0.6 };
      }
      case 'phrase': {
        const phrase = normalized.startsWith('"') && normalized.endsWith('"')
          ? normalized.slice(1, -1)
          : normalized;
        return { type: 'phrase', terms: [phrase] };
      }
      case 'exact':
        return { type: 'exact', terms: [normalized] };
      default:
        return this.parseQuery(normalized);
    }
  }

  private buildParsedCondition(
    alias: string,
    fields: string[],
    parsed: ParsedQuery,
    prefix: string,
    params: Record<string, any>,
    weight = 1,
  ): { where: string; score: string } {
    if (!fields.length) {
      throw new BadRequestException('No searchable fields available for this query');
    }

    switch (parsed.type) {
      case 'contains': {
        const paramKey = `${prefix}Term0`;
        params[paramKey] = parsed.terms[0];
        return {
          where: this.buildContainsWhere(alias, fields, paramKey),
          score: this.wrapScore(this.buildContainsScore(alias, fields, paramKey), weight),
        };
      }
      case 'prefix': {
        const paramKey = `${prefix}Term0`;
        params[paramKey] = parsed.terms[0];
        return {
          where: this.buildPrefixWhere(alias, fields, paramKey),
          score: this.wrapScore(this.buildPrefixScore(alias, fields, paramKey), weight),
        };
      }
      case 'fuzzy': {
        const paramKey = `${prefix}Term0`;
        const thresholdKey = `${prefix}Threshold`;
        params[paramKey] = parsed.terms[0];
        params[thresholdKey] = parsed.fuzzyThreshold ?? 0.6;
        if (this.apocAvailable) {
          return {
            where: this.buildFuzzyWhere(alias, fields, paramKey, thresholdKey),
            score: this.wrapScore(this.buildFuzzyScore(alias, fields, paramKey), weight),
          };
        }
        return {
          where: `(${this.buildContainsWhere(alias, fields, paramKey)} OR ${this.buildPrefixWhere(alias, fields, paramKey)})`,
          score: this.wrapScore(this.buildContainsScore(alias, fields, paramKey), weight),
        };
      }
      case 'phrase': {
        const paramKey = `${prefix}Term0`;
        params[paramKey] = parsed.terms[0];
        return {
          where: this.buildContainsWhere(alias, fields, paramKey),
          score: this.wrapScore(this.buildPhraseScore(alias, fields, paramKey), weight),
        };
      }
      case 'exact': {
        const paramKey = `${prefix}Term0`;
        params[paramKey] = parsed.terms[0];
        return {
          where: this.buildExactWhere(alias, fields, paramKey),
          score: this.wrapScore(this.buildExactScore(alias, fields, paramKey), weight),
        };
      }
      case 'and': {
        const clauses: string[] = [];
        const scores: string[] = [];
        parsed.terms.forEach((term, index) => {
          const paramKey = `${prefix}Term${index}`;
          params[paramKey] = term;
          clauses.push(`(${this.buildContainsWhere(alias, fields, paramKey)})`);
          scores.push(this.buildContainsScore(alias, fields, paramKey));
        });
        return {
          where: clauses.join(' AND '),
          score: this.wrapScore(scores.join(' + '), weight),
        };
      }
      case 'or': {
        const clauses: string[] = [];
        const scores: string[] = [];
        parsed.terms.forEach((term, index) => {
          const paramKey = `${prefix}Term${index}`;
          params[paramKey] = term;
          clauses.push(`(${this.buildContainsWhere(alias, fields, paramKey)})`);
          scores.push(this.buildContainsScore(alias, fields, paramKey));
        });
        return {
          where: clauses.join(' OR '),
          score: this.wrapScore(scores.join(' + '), weight),
        };
      }
    }
  }

  private buildRelationshipClause(
    _entityConfig: EntityConfig,
    relationship: SearchRelationshipFilter,
    index: number,
    tenantId: string | undefined,
    params: Record<string, any>,
  ): string {
    const relAlias = `rel${index}`;
    const targetAlias = `target${index}`;
    const direction = relationship.direction ?? 'OUTGOING';
    const safeType = relationship.type
      ? `:${this.labelRef(relationship.type.toUpperCase())}`
      : '';

    const targetConfig = relationship.entity
      ? this.resolveEntityConfig(relationship.entity)
      : undefined;
    const targetLabel = targetConfig ? `:${this.labelRef(targetConfig.label)}` : '';

    let pattern = `(n)-[${relAlias}${safeType}]->(${targetAlias}${targetLabel})`;
    if (direction === 'INCOMING') {
      pattern = `(n)<-[${relAlias}${safeType}]-(${targetAlias}${targetLabel})`;
    } else if (direction === 'BOTH') {
      pattern = `(n)-[${relAlias}${safeType}]-(${targetAlias}${targetLabel})`;
    }

    const subClauses: string[] = [];

    if (tenantId) {
      params[`relationshipTenant${index}`] = tenantId;
      subClauses.push(`${relAlias}.tenant_id = $relationshipTenant${index}`);
    }

    if (relationship.relationshipFilters) {
      for (const [key, value] of Object.entries(relationship.relationshipFilters)) {
        const safeKey = this.neo4j.sanitizeIdentifier(key);
        const paramKey = `relationship${index}Rel${safeKey}`;
        params[paramKey] = value;
        subClauses.push(`${relAlias}.\`${safeKey}\` = $${paramKey}`);
      }
    }

    if (relationship.targetFilters) {
      for (const [key, value] of Object.entries(relationship.targetFilters)) {
        const safeKey = targetConfig
          ? this.validateField(targetConfig, key)
          : this.neo4j.sanitizeIdentifier(key);
        const paramKey = `relationship${index}Target${safeKey}`;
        params[paramKey] = value;
        subClauses.push(`${targetAlias}.\`${safeKey}\` = $${paramKey}`);
      }
    }

    if (relationship.query?.trim()) {
      const fields = targetConfig
        ? this.resolveSearchFields(targetConfig, relationship.fields)
        : (relationship.fields ?? []).map(field => this.neo4j.sanitizeIdentifier(field));
      if (!fields.length) {
        throw new BadRequestException(
          'Relationship query requires either a target entity config or explicit target fields',
        );
      }
      const parsed = this.parseQuery(relationship.query);
      const condition = this.buildParsedCondition(
        targetAlias,
        fields,
        parsed,
        `relationshipQuery${index}`,
        params,
      );
      subClauses.push(condition.where);
    }

    const whereBlock = subClauses.length ? ` WHERE ${subClauses.join(' AND ')}` : '';
    return `EXISTS { MATCH ${pattern}${whereBlock} }`;
  }

  private buildRangeClause(
    entityConfig: EntityConfig,
    range: SearchRangeFilter,
    index: number,
    params: Record<string, any>,
  ): string {
    const field = this.validateField(entityConfig, range.field);
    const type = entityConfig.propertyTypes?.[field] ?? 'String';
    const expression = this.buildComparableFieldExpression('n', field, type);
    const clauses: string[] = [];

    const register = (suffix: string, operator: string, value: string | number) => {
      const paramKey = `range${index}${suffix}`;
      params[paramKey] = value;
      clauses.push(`${expression} ${operator} ${this.buildComparableParamExpression(type, paramKey)}`);
    };

    if (range.gt !== undefined) {
      register('Gt', '>', range.gt);
    }
    if (range.gte !== undefined) {
      register('Gte', '>=', range.gte);
    }
    if (range.lt !== undefined) {
      register('Lt', '<', range.lt);
    }
    if (range.lte !== undefined) {
      register('Lte', '<=', range.lte);
    }

    if (!clauses.length) {
      throw new BadRequestException(`Range filter for field "${field}" is missing bounds`);
    }

    return clauses.join(' AND ');
  }

  private buildAggregationExpression(
    entityConfig: EntityConfig,
    aggregation: SearchAggregationRequest,
  ): string {
    const field = aggregation.field ? this.validateField(entityConfig, aggregation.field) : undefined;
    const type = field ? entityConfig.propertyTypes?.[field] ?? 'String' : undefined;

    switch (aggregation.operation) {
      case 'count':
        return field ? `count(${this.fieldRef('n', field)})` : 'count(n)';
      case 'countDistinct':
        if (!field) {
          throw new BadRequestException('countDistinct aggregation requires a field');
        }
        return `count(DISTINCT ${this.fieldRef('n', field)})`;
      case 'min':
        if (!field) {
          throw new BadRequestException('min aggregation requires a field');
        }
        return `min(${this.buildComparableFieldExpression('n', field, type ?? 'String')})`;
      case 'max':
        if (!field) {
          throw new BadRequestException('max aggregation requires a field');
        }
        return `max(${this.buildComparableFieldExpression('n', field, type ?? 'String')})`;
      case 'avg':
      case 'sum':
        if (!field) {
          throw new BadRequestException(`${aggregation.operation} aggregation requires a field`);
        }
        if (!this.isNumericType(type)) {
          throw new BadRequestException(`${aggregation.operation} aggregation requires a numeric field`);
        }
        return `${aggregation.operation}(toFloat(${this.fieldRef('n', field)}))`;
    }
  }

  private buildContainsWhere(alias: string, fields: string[], paramKey: string): string {
    return fields
      .map(field => `toLower(toString(${this.fieldRef(alias, field)})) CONTAINS toLower($${paramKey})`)
      .join(' OR ');
  }

  private buildPrefixWhere(alias: string, fields: string[], paramKey: string): string {
    return fields
      .map(field => `toLower(toString(${this.fieldRef(alias, field)})) STARTS WITH toLower($${paramKey})`)
      .join(' OR ');
  }

  private buildExactWhere(alias: string, fields: string[], paramKey: string): string {
    return fields
      .map(field => `toLower(toString(${this.fieldRef(alias, field)})) = toLower($${paramKey})`)
      .join(' OR ');
  }

  private buildFuzzyWhere(
    alias: string,
    fields: string[],
    paramKey: string,
    thresholdKey: string,
  ): string {
    return fields
      .map(field =>
        `apoc.text.levenshteinSimilarity(toLower(toString(${this.fieldRef(alias, field)})), toLower($${paramKey})) > $${thresholdKey}`,
      )
      .join(' OR ');
  }

  private buildContainsScore(alias: string, fields: string[], paramKey: string): string {
    return fields
      .map(field =>
        `CASE WHEN toLower(toString(${this.fieldRef(alias, field)})) CONTAINS toLower($${paramKey}) THEN 1 ELSE 0 END`,
      )
      .join(' + ');
  }

  private buildPrefixScore(alias: string, fields: string[], paramKey: string): string {
    return fields
      .map(field =>
        `CASE WHEN toLower(toString(${this.fieldRef(alias, field)})) STARTS WITH toLower($${paramKey}) THEN 2 ` +
        `WHEN toLower(toString(${this.fieldRef(alias, field)})) CONTAINS toLower($${paramKey}) THEN 1 ELSE 0 END`,
      )
      .join(' + ');
  }

  private buildPhraseScore(alias: string, fields: string[], paramKey: string): string {
    return fields
      .map(field =>
        `CASE WHEN toLower(toString(${this.fieldRef(alias, field)})) = toLower($${paramKey}) THEN 3 ` +
        `WHEN toLower(toString(${this.fieldRef(alias, field)})) CONTAINS toLower($${paramKey}) THEN 1 ELSE 0 END`,
      )
      .join(' + ');
  }

  private buildExactScore(alias: string, fields: string[], paramKey: string): string {
    return fields
      .map(field =>
        `CASE WHEN toLower(toString(${this.fieldRef(alias, field)})) = toLower($${paramKey}) THEN 4 ELSE 0 END`,
      )
      .join(' + ');
  }

  private buildFuzzyScore(alias: string, fields: string[], paramKey: string): string {
    return fields
      .map(field =>
        `apoc.text.levenshteinSimilarity(toLower(toString(${this.fieldRef(alias, field)})), toLower($${paramKey}))`,
      )
      .join(' + ');
  }

  private buildComparableFieldExpression(alias: string, field: string, type: string): string {
    const ref = this.fieldRef(alias, field);
    if (this.isIntegerType(type)) {
      return `toInteger(${ref})`;
    }
    if (this.isNumericType(type)) {
      return `toFloat(${ref})`;
    }
    if (this.isDateTimeType(type)) {
      return `datetime(toString(${ref}))`;
    }
    if (this.isDateType(type)) {
      return `date(toString(${ref}))`;
    }
    return `toString(${ref})`;
  }

  private buildComparableParamExpression(type: string, paramKey: string): string {
    if (this.isDateTimeType(type)) {
      return `datetime($${paramKey})`;
    }
    if (this.isDateType(type)) {
      return `date($${paramKey})`;
    }
    return `$${paramKey}`;
  }

  private buildTenantScopeClause(
    alias: string,
    paramKey: string,
    params: Record<string, any>,
    tenantId: string,
  ): string {
    params[paramKey] = tenantId;
    const tenantRelAlias = `${paramKey}Rel`;
    return `EXISTS { MATCH (${alias})-[${tenantRelAlias}]-() WHERE ${tenantRelAlias}.tenant_id = $${paramKey} }`;
  }

  private buildResultDecorations(
    entityConfig: EntityConfig,
    data: Record<string, any>,
    request: AdvancedSearchRequest,
  ): Pick<FullTextSearchResult, 'highlights' | 'matches'> {
    const highlights: Record<string, string> = {};
    const matches: SearchMatchExplanation[] = [];

    if (request.q?.trim()) {
      const parsed = this.parseQuery(request.q);
      const fields = this.resolveSearchFields(entityConfig, request.fields);
      this.collectFieldMatches(data, fields, parsed, 'root', request.q, highlights, matches);
    }

    for (const fieldQuery of request.fieldQueries ?? []) {
      const field = this.validateField(entityConfig, fieldQuery.field);
      const parsed = fieldQuery.operator
        ? this.parseOperatorQuery(fieldQuery.query, fieldQuery.operator)
        : this.parseQuery(fieldQuery.query);
      this.collectFieldMatches(
        data,
        [field],
        parsed,
        'field',
        fieldQuery.query,
        highlights,
        matches,
        fieldQuery.boost,
      );
    }

    for (const range of request.ranges ?? []) {
      matches.push({
        source: 'range',
        field: range.field,
        operator: 'range',
        description: JSON.stringify(range),
      });
    }

    for (const relationship of request.relationships ?? []) {
      matches.push({
        source: 'relationship',
        operator: 'exists',
        relationshipType: relationship.type,
        targetEntity: relationship.entity,
        query: relationship.query,
        description: `Matched relationship filter ${relationship.type ?? 'ANY'}${relationship.entity ? ` -> ${relationship.entity}` : ''}`,
      });
    }

    return {
      highlights: Object.keys(highlights).length ? highlights : undefined,
      matches: matches.length ? matches : undefined,
    };
  }

  private collectFieldMatches(
    data: Record<string, any>,
    fields: string[],
    parsed: ParsedQuery,
    source: 'root' | 'field',
    originalQuery: string,
    highlights: Record<string, string>,
    matches: SearchMatchExplanation[],
    boost = 1,
  ) {
    for (const field of fields) {
      const rawValue = data[field];
      if (rawValue === undefined || rawValue === null) {
        continue;
      }

      const value = String(rawValue);
      if (!this.matchesParsedValue(value, parsed)) {
        continue;
      }

      const highlighted = this.highlightValue(value, parsed);
      if (highlighted !== value) {
        highlights[field] = highlighted;
      }

      matches.push({
        source,
        field,
        operator: parsed.type,
        query: originalQuery,
        matchedValue: value,
        scoreContribution: this.estimateScoreContribution(parsed, value, boost),
      });
    }
  }

  private matchesParsedValue(value: string, parsed: ParsedQuery): boolean {
    const lowerValue = value.toLowerCase();
    switch (parsed.type) {
      case 'contains':
        return lowerValue.includes(parsed.terms[0].toLowerCase());
      case 'prefix':
        return lowerValue.startsWith(parsed.terms[0].toLowerCase());
      case 'exact':
        return lowerValue === parsed.terms[0].toLowerCase();
      case 'phrase':
        return lowerValue.includes(parsed.terms[0].toLowerCase());
      case 'fuzzy':
        return this.computeSimilarity(lowerValue, parsed.terms[0].toLowerCase()) > (parsed.fuzzyThreshold ?? 0.6);
      case 'and':
        return parsed.terms.every(term => lowerValue.includes(term.toLowerCase()));
      case 'or':
        return parsed.terms.some(term => lowerValue.includes(term.toLowerCase()));
    }
  }

  private highlightValue(value: string, parsed: ParsedQuery): string {
    switch (parsed.type) {
      case 'contains':
      case 'phrase':
      case 'and':
      case 'or':
        return parsed.terms.reduce(
          (current, term) => this.highlightTerm(current, term),
          value,
        );
      case 'prefix': {
        const escaped = this.escapeRegex(parsed.terms[0]);
        return value.replace(new RegExp(`^(${escaped})`, 'i'), '<mark>$1</mark>');
      }
      case 'exact':
      case 'fuzzy':
        return `<mark>${value}</mark>`;
    }
  }

  private highlightTerm(value: string, term: string): string {
    const escaped = this.escapeRegex(term);
    return value.replace(new RegExp(`(${escaped})`, 'ig'), '<mark>$1</mark>');
  }

  private estimateScoreContribution(parsed: ParsedQuery, value: string, boost = 1): number {
    const normalizedBoost = this.normalizeBoost(boost);
    switch (parsed.type) {
      case 'exact':
        return 4 * normalizedBoost;
      case 'phrase':
        return value.toLowerCase() === parsed.terms[0].toLowerCase()
          ? 3 * normalizedBoost
          : 1 * normalizedBoost;
      case 'prefix':
        return 2 * normalizedBoost;
      case 'fuzzy':
        return this.computeSimilarity(value.toLowerCase(), parsed.terms[0].toLowerCase()) * normalizedBoost;
      case 'contains':
      case 'and':
      case 'or':
        return 1 * normalizedBoost;
    }
  }

  private resolveEntityConfig(entity: string): EntityConfig {
    const byKey = ENTITY_CONFIGS[entity.toLowerCase()];
    if (byKey) {
      return byKey;
    }
    const byLabel = getAllEntities().find(
      config => config.label.toLowerCase() === entity.toLowerCase(),
    );
    if (byLabel) {
      return byLabel;
    }
    throw new BadRequestException(`Unknown entity: ${entity}`);
  }

  private resolveSearchFields(config: EntityConfig, requested?: string[]): string[] {
    if (requested?.length) {
      return requested.map(field => this.validateField(config, field));
    }
    return this.getDefaultTextFields(config);
  }

  private getDefaultTextFields(config: EntityConfig): string[] {
    return Object.keys(config.properties).filter(field => {
      const type = config.propertyTypes?.[field];
      if (field.endsWith('_id')) {
        return false;
      }
      if (this.isNumericType(type) || this.isDateType(type) || this.isDateTimeType(type)) {
        return false;
      }
      return true;
    });
  }

  private validateField(config: EntityConfig, field: string): string {
    const safeField = this.neo4j.sanitizeIdentifier(field);
    const knownFields = new Set([config.idField, ...Object.keys(config.properties)]);
    if (!knownFields.has(safeField)) {
      throw new BadRequestException(`Unknown field "${field}" for entity ${config.key}`);
    }
    return safeField;
  }

  private buildWhereBlock(clauses: string[]): string {
    if (!clauses.length) {
      return '';
    }
    return `WHERE ${clauses.join('\n          AND ')}`;
  }

  private fieldRef(alias: string, field: string): string {
    return `${alias}.\`${field}\``;
  }

  private labelRef(label: string): string {
    return `\`${this.neo4j.sanitizeIdentifier(label)}\``;
  }

  private wrapScore(expression: string, weight: number): string {
    const normalizedWeight = this.normalizeBoost(weight);
    return normalizedWeight === 1
      ? `(${expression})`
      : `((${expression}) * ${normalizedWeight})`;
  }

  private defaultAggregationName(
    aggregation: SearchAggregationRequest,
    index: number,
  ): string {
    return aggregation.field
      ? `${aggregation.operation}_${aggregation.field}`
      : aggregation.name || `aggregation_${index}`;
  }

  private normalizeLimit(limit: number, max = 1000): number {
    if (!Number.isFinite(limit)) {
      throw new BadRequestException('Limit must be numeric');
    }
    const normalized = Math.floor(limit);
    if (normalized < 1 || normalized > max) {
      throw new BadRequestException(`Limit must be between 1 and ${max}`);
    }
    return normalized;
  }

  private normalizeBoost(boost?: number): number {
    if (boost === undefined) {
      return 1;
    }
    if (!Number.isFinite(boost) || boost <= 0) {
      throw new BadRequestException('Boost must be a positive number');
    }
    return boost;
  }

  private isNumericType(type?: string): boolean {
    return ['Integer', 'Float', 'Long', 'Double'].includes(type ?? '');
  }

  private isIntegerType(type?: string): boolean {
    return ['Integer', 'Long'].includes(type ?? '');
  }

  private isDateType(type?: string): boolean {
    return ['Date', 'LocalDate'].includes(type ?? '');
  }

  private isDateTimeType(type?: string): boolean {
    return ['DateTime', 'LocalDateTime'].includes(type ?? '');
  }

  private normalizeValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }
    if (typeof value?.toNumber === 'function') {
      return value.toNumber();
    }
    if (Array.isArray(value)) {
      return value.map(item => this.normalizeValue(item));
    }
    if (typeof value === 'object' && value.properties) {
      return this.neo4j.toPlainObject(value.properties);
    }
    return value;
  }

  private computeSimilarity(left: string, right: string): number {
    if (left === right) {
      return 1;
    }
    const distance = this.levenshtein(left, right);
    return 1 - distance / Math.max(left.length, right.length, 1);
  }

  private levenshtein(left: string, right: string): number {
    const matrix = Array.from({ length: left.length + 1 }, () => new Array<number>(right.length + 1).fill(0));

    for (let i = 0; i <= left.length; i += 1) {
      matrix[i][0] = i;
    }
    for (let j = 0; j <= right.length; j += 1) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= left.length; i += 1) {
      for (let j = 1; j <= right.length; j += 1) {
        const cost = left[i - 1] === right[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }

    return matrix[left.length][right.length];
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async checkApocAvailability() {
    if (this.apocAvailable !== null) {
      return;
    }

    try {
      await this.neo4j.runQuery(
        `RETURN apoc.text.levenshteinSimilarity('test', 'test') AS score`,
      );
      this.apocAvailable = true;
    } catch {
      this.apocAvailable = false;
    }
  }
}

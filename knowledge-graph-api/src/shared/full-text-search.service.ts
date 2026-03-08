import { Injectable, BadRequestException } from '@nestjs/common';
import neo4j from 'neo4j-driver';
import { Neo4jService } from '../neo4j/neo4j.service';
import { ENTITY_CONFIGS, EntityConfig } from './entity-config';

// ── Types ────────────────────────────────────────────────────────────────

export interface FullTextSearchResult {
  entity: string;
  id: string;
  score: number;
  data: Record<string, any>;
}

export interface FullTextSearchConfig {
  entity: string;
  query: string;
  fields?: string[];
  tenantId?: string;
  limit?: number;
}

// ── Query parser types ──────────────────────────────────────────────────

type QueryType = 'contains' | 'prefix' | 'fuzzy' | 'phrase' | 'and' | 'or';

interface ParsedQuery {
  type: QueryType;
  terms: string[];
  fuzzyThreshold?: number;
}

// ── Service ─────────────────────────────────────────────────────────────

@Injectable()
export class FullTextSearchService {
  private apocAvailable: boolean | null = null;

  constructor(private readonly neo4j: Neo4jService) {}

  async initializeIndexes() {
    console.log('\n📚 Initializing search engine...');
    await this.checkApocAvailability();
    const mode = this.apocAvailable ? 'APOC-enhanced' : 'Cypher-only';
    console.log(`  ✓ Search ready (${mode})`);
    console.log('  Supports: contains, prefix*, fuzzy~, "phrase", AND, OR\n');
  }

  // ── Public API ────────────────────────────────────────────────────────

  async search(config: FullTextSearchConfig): Promise<FullTextSearchResult[]> {
    const entityConfig = ENTITY_CONFIGS[config.entity];
    if (!entityConfig) {
      throw new BadRequestException(`Unknown entity: ${config.entity}`);
    }

    if (this.apocAvailable === null) {
      await this.checkApocAvailability();
    }

    const limit = Math.floor(config.limit || 50);
    const parsed = this.parseQuery(config.query);
    const textFields = this.getTextFields(entityConfig, config.fields);

    if (textFields.length === 0) {
      return [];
    }

    const { cypher, params } = this.buildCypher(
      entityConfig, textFields, parsed, config.tenantId, limit,
    );

    try {
      const records = await this.neo4j.runQuery(cypher, params);
      return records.map(r => ({
        entity: config.entity,
        id: this.neo4j.toPlainObject(r.get('n').properties)[entityConfig.idField],
        score: typeof r.get('score') === 'number'
          ? r.get('score')
          : (r.get('score')?.toNumber?.() ?? 1.0),
        data: this.neo4j.toPlainObject(r.get('n').properties),
      }));
    } catch (err: any) {
      console.error(`Search error [${config.entity}]:`, err.message);
      return [];
    }
  }

  // ── Convenience methods ───────────────────────────────────────────────

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

  async advancedSearch(entity: string, query: string, limit = 50) {
    return this.search({ entity, query, limit });
  }

  // ── Query Parser ──────────────────────────────────────────────────────

  private parseQuery(raw: string): ParsedQuery {
    const trimmed = raw.trim();

    // Phrase search: "exact phrase"
    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 2) {
      return { type: 'phrase', terms: [trimmed.slice(1, -1)] };
    }

    // AND operator: term1 AND term2 [AND term3 ...]
    if (/\bAND\b/.test(trimmed)) {
      const terms = trimmed.split(/\s+AND\s+/i).map(t => t.trim()).filter(Boolean);
      return { type: 'and', terms };
    }

    // OR operator: term1 OR term2 [OR term3 ...]
    if (/\bOR\b/.test(trimmed)) {
      const terms = trimmed.split(/\s+OR\s+/i).map(t => t.trim()).filter(Boolean);
      return { type: 'or', terms };
    }

    // Fuzzy search: term~ or term~0.8
    if (/^[^\s]+~(\d+\.?\d*)?$/.test(trimmed)) {
      const match = trimmed.match(/^([^\s]+?)~(\d+\.?\d*)?$/);
      const term = match![1];
      const threshold = match![2] ? parseFloat(match![2]) : 0.6;
      const cappedThreshold = Math.min(Math.max(threshold, 0.1), 0.99);
      return { type: 'fuzzy', terms: [term], fuzzyThreshold: cappedThreshold };
    }

    // Prefix search: term*
    if (trimmed.endsWith('*') && !trimmed.includes(' ')) {
      return { type: 'prefix', terms: [trimmed.slice(0, -1)] };
    }

    // Multiple space-separated words → implicit AND
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
      return { type: 'and', terms: words };
    }

    // Default: simple contains
    return { type: 'contains', terms: [trimmed] };
  }

  // ── Cypher Builder ────────────────────────────────────────────────────

  private buildCypher(
    entityConfig: EntityConfig,
    textFields: string[],
    parsed: ParsedQuery,
    tenantId: string | undefined,
    limit: number,
  ): { cypher: string; params: Record<string, any> } {
    const label = entityConfig.label;
    const params: Record<string, any> = { limit: neo4j.int(limit) };

    let whereClause: string;
    let scoringExpr: string;

    switch (parsed.type) {
      case 'contains':
        params.term0 = parsed.terms[0];
        whereClause = this.buildContainsWhere(textFields, 'term0');
        scoringExpr = this.buildContainsScore(textFields, 'term0');
        break;

      case 'prefix':
        params.term0 = parsed.terms[0];
        whereClause = this.buildPrefixWhere(textFields, 'term0');
        scoringExpr = this.buildPrefixScore(textFields, 'term0');
        break;

      case 'fuzzy':
        params.term0 = parsed.terms[0];
        params.fuzzyThreshold = parsed.fuzzyThreshold ?? 0.6;
        if (this.apocAvailable) {
          whereClause = this.buildFuzzyWhereApoc(textFields, 'term0');
          scoringExpr = this.buildFuzzyScoreApoc(textFields, 'term0');
        } else {
          // Fallback: prefix + contains as approximation when APOC unavailable
          whereClause = `(${this.buildContainsWhere(textFields, 'term0')} OR ${this.buildPrefixWhere(textFields, 'term0')})`;
          scoringExpr = this.buildContainsScore(textFields, 'term0');
        }
        break;

      case 'phrase':
        params.term0 = parsed.terms[0];
        whereClause = this.buildContainsWhere(textFields, 'term0');
        scoringExpr = this.buildPhraseScore(textFields, 'term0');
        break;

      case 'and': {
        const andParts: string[] = [];
        const scoreParts: string[] = [];
        parsed.terms.forEach((term, i) => {
          params[`term${i}`] = term;
          andParts.push(`(${this.buildContainsWhere(textFields, `term${i}`)})`);
          scoreParts.push(this.buildContainsScore(textFields, `term${i}`));
        });
        whereClause = andParts.join(' AND ');
        scoringExpr = scoreParts.join(' + ');
        break;
      }

      case 'or': {
        const orParts: string[] = [];
        const scoreParts: string[] = [];
        parsed.terms.forEach((term, i) => {
          params[`term${i}`] = term;
          orParts.push(`(${this.buildContainsWhere(textFields, `term${i}`)})`);
          scoreParts.push(this.buildContainsScore(textFields, `term${i}`));
        });
        whereClause = orParts.join(' OR ');
        scoringExpr = scoreParts.join(' + ');
        break;
      }
    }

    let tenantFilter = '';
    if (tenantId) {
      params.tenantId = tenantId;
      tenantFilter = 'AND n.tenant_id = $tenantId';
    }

    const cypher = `
      MATCH (n:\`${label}\`)
      WHERE ${whereClause}
      ${tenantFilter}
      WITH n, (${scoringExpr}) AS score
      RETURN n, score, labels(n) AS labels
      ORDER BY score DESC
      LIMIT $limit
    `;

    return { cypher, params };
  }

  // ── WHERE clause builders ─────────────────────────────────────────────

  private buildContainsWhere(fields: string[], paramKey: string): string {
    return fields
      .map(f => `toLower(toString(n.\`${f}\`)) CONTAINS toLower($${paramKey})`)
      .join(' OR ');
  }

  private buildPrefixWhere(fields: string[], paramKey: string): string {
    return fields
      .map(f => `toLower(toString(n.\`${f}\`)) STARTS WITH toLower($${paramKey})`)
      .join(' OR ');
  }

  private buildFuzzyWhereApoc(fields: string[], paramKey: string): string {
    return fields
      .map(f =>
        `apoc.text.levenshteinSimilarity(toLower(toString(n.\`${f}\`)), toLower($${paramKey})) > $fuzzyThreshold`,
      )
      .join(' OR ');
  }

  // ── Score expression builders ─────────────────────────────────────────

  /** +1 per field that contains the term */
  private buildContainsScore(fields: string[], paramKey: string): string {
    return fields
      .map(f =>
        `CASE WHEN toLower(toString(n.\`${f}\`)) CONTAINS toLower($${paramKey}) THEN 1 ELSE 0 END`,
      )
      .join(' + ');
  }

  /** +2 for STARTS WITH (prefix > substring), +1 for CONTAINS */
  private buildPrefixScore(fields: string[], paramKey: string): string {
    return fields
      .map(f =>
        `CASE WHEN toLower(toString(n.\`${f}\`)) STARTS WITH toLower($${paramKey}) THEN 2 ` +
        `WHEN toLower(toString(n.\`${f}\`)) CONTAINS toLower($${paramKey}) THEN 1 ELSE 0 END`,
      )
      .join(' + ');
  }

  /** +3 for exact match, +1 for contains */
  private buildPhraseScore(fields: string[], paramKey: string): string {
    return fields
      .map(f =>
        `CASE WHEN toLower(toString(n.\`${f}\`)) = toLower($${paramKey}) THEN 3 ` +
        `WHEN toLower(toString(n.\`${f}\`)) CONTAINS toLower($${paramKey}) THEN 1 ELSE 0 END`,
      )
      .join(' + ');
  }

  /** APOC levenshtein similarity (0.0–1.0 per field, summed) */
  private buildFuzzyScoreApoc(fields: string[], paramKey: string): string {
    return fields
      .map(f =>
        `apoc.text.levenshteinSimilarity(toLower(toString(n.\`${f}\`)), toLower($${paramKey}))`,
      )
      .join(' + ');
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private getTextFields(config: EntityConfig, overrideFields?: string[]): string[] {
    if (overrideFields && overrideFields.length > 0) {
      return overrideFields;
    }
    const numericTypes = new Set(['Integer', 'Float', 'Long', 'Double']);
    return Object.keys(config.properties).filter(prop => {
      if (prop.endsWith('_id')) return false;
      if (prop.includes('date')) return false;
      if (prop.includes('latitude') || prop.includes('longitude')) return false;
      if (prop.includes('population')) return false;
      if (config.propertyTypes && numericTypes.has(config.propertyTypes[prop])) return false;
      return true;
    });
  }

  private async checkApocAvailability() {
    if (this.apocAvailable !== null) return;
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

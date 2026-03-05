import { Injectable, BadRequestException } from '@nestjs/common';
import neo4j from 'neo4j-driver';
import { Neo4jService } from '../neo4j/neo4j.service';
import { ENTITY_CONFIGS } from './entity-config';

/**
 * Generic Query Builder Service
 * 
 * Allows dynamic construction of complex queries without hardcoding specific patterns.
 * Supports:
 * - Multiple entity matches and relationships
 * - Tenant scoping
 * - Multi-field filtering
 * - Ordering and pagination
 * 
 * Example usage:
 * ```
 * const results = await queryBuilder.execute({
 *   mainEntity: { config: personConfig, alias: 'p' },
 *   relationships: [
 *     {
 *       type: 'WORKS_AT',
 *       direction: '->',
 *       targetEntity: { config: orgConfig, alias: 'o' },
 *       filters: { org_id: 'ORG_123' }
 *     },
 *     {
 *       type: 'HAS_SKILL',
 *       direction: '->',
 *       targetEntity: { config: skillConfig, alias: 's' },
 *       filters: { skill_id: 'JAVA' }
 *     }
 *   ],
 *   returns: ['p', 'o.name AS orgName', 's.name AS skillName'],
 *   tenantId: 'TENANT_1',
 *   orderBy: 'p.last_name',
 *   limit: 100
 * });
 * ```
 */

export interface EntityReference {
  config: any; // EntityConfig
  alias: string;
  filterFields?: Record<string, any>; // Additional filters on the entity itself
}

export interface RelationshipStep {
  type: string; // Relationship type (e.g., 'WORKS_AT', 'HAS_SKILL')
  direction: '->' | '<-' | '--'; // Arrow direction
  targetEntity: EntityReference;
  filters?: Record<string, any>; // Relationship properties to filter on
}

export interface QueryBuilderConfig {
  mainEntity: EntityReference;
  relationships?: RelationshipStep[];
  returns: string[]; // What to return (e.g., ['p', 'labels(p) AS labels', 'o.name AS orgName'])
  whereConditions?: Record<string, any>; // Additional WHERE clause conditions
  tenantId?: string; // For multi-tenant scoping
  orderBy?: string; // Order by clause (e.g., 'p.last_name')
  limit?: number;
  distinct?: boolean; // Use DISTINCT
}

@Injectable()
export class GenericQueryService {
  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Build and execute a complex query dynamically.
   */
  async execute(config: QueryBuilderConfig) {
    const { query, params } = this.buildQuery(config);
    const records = await this.neo4j.runQuery(query, params);
    return records.map(r => this.formatResult(r, config.returns));
  }

  /**
   * Build the Cypher query from configuration.
   */
  private buildQuery(config: QueryBuilderConfig): { query: string; params: Record<string, any> } {
    const params: Record<string, any> = {};
    const parts: string[] = [];

    // ── MATCH clause ──────────────────────────────────────────────────────
    const matchParts = this.buildMatchClauses(config, params);
    parts.push(`MATCH ${matchParts.join('')}`);

    // ── WHERE clause (for relationship filters and additional conditions) ──
    const whereClauses = this.buildWhereClauses(config, params);
    if (whereClauses.length) {
      parts.push(`WHERE ${whereClauses.join(' AND ')}`);
    }

    // ── RETURN clause ─────────────────────────────────────────────────────
    const selectClause = config.distinct ? 'RETURN DISTINCT' : 'RETURN';
    parts.push(`${selectClause} ${config.returns.join(', ')}`);

    // ── ORDER BY clause ───────────────────────────────────────────────────
    if (config.orderBy) {
      parts.push(`ORDER BY ${config.orderBy}`);
    }

    // ── LIMIT clause ──────────────────────────────────────────────────────
    if (config.limit) {
      params.limit = neo4j.int(config.limit);
      parts.push('LIMIT $limit');
    }

    return {
      query: parts.join('\n'),
      params,
    };
  }

  /**
   * Build MATCH clauses for main entity and relationships.
   */
  private buildMatchClauses(config: QueryBuilderConfig, params: Record<string, any>): string[] {
    const clauses: string[] = [];

    // Main entity
    const mainAlias = config.mainEntity.alias;
    const mainLabel = config.mainEntity.config.label;
    const mainIdField = config.mainEntity.config.idField;
    
    let mainMatch = `(${mainAlias}:\`${mainLabel}\``;
    
    // Add filters on main entity
    if (config.mainEntity.filterFields && Object.keys(config.mainEntity.filterFields).length) {
      const filterParts = [];
      for (const [field, value] of Object.entries(config.mainEntity.filterFields)) {
        const paramKey = `main_${field}`;
        params[paramKey] = value;
        filterParts.push(`${mainAlias}.\`${field}\` = $${paramKey}`);
      }
      mainMatch += ` { ${filterParts.join(', ')} }`;
    }
    mainMatch += ')';
    clauses.push(mainMatch);

    // Relationships
    if (config.relationships && config.relationships.length) {
      for (let i = 0; i < config.relationships.length; i++) {
        const rel = config.relationships[i];
        const targetAlias = rel.targetEntity.alias;
        const targetLabel = rel.targetEntity.config.label;

        // Build relationship match
        let relMatch = '';
        if (rel.direction === '->') {
          relMatch = `(${mainAlias})-[r${i}:\`${rel.type}\``;
        } else if (rel.direction === '<-') {
          relMatch = `(${mainAlias})<-[r${i}:\`${rel.type}\``;
        } else {
          relMatch = `(${mainAlias})-[r${i}:\`${rel.type}\``;
        }

        // Add relationship filters
        if (rel.filters && Object.keys(rel.filters).length) {
          const filterParts = [];
          for (const [field, value] of Object.entries(rel.filters)) {
            const paramKey = `rel${i}_${field}`;
            params[paramKey] = value;
            filterParts.push(`r${i}.\`${field}\` = $${paramKey}`);
          }
          relMatch += ` { ${filterParts.join(', ')} }`;
        }
        relMatch += `]-${rel.direction === '<-' ? '-' : '>'} (${targetAlias}:\`${targetLabel}\``;

        // Add filters on target entity
        if (rel.targetEntity.filterFields && Object.keys(rel.targetEntity.filterFields).length) {
          const filterParts = [];
          for (const [field, value] of Object.entries(rel.targetEntity.filterFields)) {
            const paramKey = `${targetAlias}_${field}`;
            params[paramKey] = value;
            filterParts.push(`${targetAlias}.\`${field}\` = $${paramKey}`);
          }
          relMatch += ` { ${filterParts.join(', ')} }`;
        }
        relMatch += ')';
        clauses.push(relMatch);
      }
    }

    return clauses;
  }

  /**
   * Build WHERE clauses for tenant scoping and other conditions.
   */
  private buildWhereClauses(config: QueryBuilderConfig, params: Record<string, any>): string[] {
    const clauses: string[] = [];

    // Tenant scoping on relationships
    if (config.tenantId && config.relationships && config.relationships.length) {
      for (let i = 0; i < config.relationships.length; i++) {
        params[`tenant_id_${i}`] = config.tenantId;
        clauses.push(`r${i}.tenant_id = $tenant_id_${i}`);
      }
    }

    // Additional WHERE conditions
    if (config.whereConditions && Object.keys(config.whereConditions).length) {
      for (const [key, value] of Object.entries(config.whereConditions)) {
        const paramKey = `where_${key}`;
        params[paramKey] = value;
        clauses.push(`${key} = $${paramKey}`);
      }
    }

    return clauses;
  }

  /**
   * Format result row based on return fields.
   */
  private formatResult(record: any, returnFields: string[]): Record<string, any> {
    const result: Record<string, any> = {};

    for (const field of returnFields) {
      // Handle aliases (e.g., "o.name AS orgName" -> key is "orgName")
      if (field.includes(' AS ')) {
        const [_expr, alias] = field.split(' AS ');
        const value = record.get(alias.trim());
        result[alias.trim()] = value && value.properties ? this.neo4j.toPlainObject(value.properties) : value;
      } else {
        // Direct field (e.g., "p" -> get as is)
        const value = record.get(field);
        result[field] = value && value.properties ? this.neo4j.toPlainObject(value.properties) : value;
      }
    }

    return result;
  }

  /**
   * Convenience: Query persons working at a specific org (now uses generic builder).
   */
  async getPersonsWorkingAtOrg(orgId: string, tenantId: string) {
    const personConfig = ENTITY_CONFIGS.person;
    const orgConfig = ENTITY_CONFIGS.organization;

    return this.execute({
      mainEntity: { config: personConfig, alias: 'p' },
      relationships: [
        {
          type: 'WORKS_AT',
          direction: '->',
          targetEntity: { config: orgConfig, alias: 'o', filterFields: { org_id: orgId } },
        },
      ],
      returns: [
        'p',
        'labels(p) AS labels',
        'o.name AS orgName',
      ],
      tenantId,
      orderBy: 'p.last_name',
    });
  }

  /**
   * Convenience: Query persons enrolled in a specific org.
   */
  async getPersonsEnrolledInOrg(orgId: string, tenantId: string) {
    const personConfig = ENTITY_CONFIGS.person;
    const orgConfig = ENTITY_CONFIGS.organization;

    return this.execute({
      mainEntity: { config: personConfig, alias: 'p' },
      relationships: [
        {
          type: 'ENROLLED_IN',
          direction: '->',
          targetEntity: { config: orgConfig, alias: 'o', filterFields: { org_id: orgId } },
        },
      ],
      returns: [
        'p',
        'labels(p) AS labels',
        'o.name AS orgName',
      ],
      tenantId,
      orderBy: 'p.last_name',
    });
  }

  /**
   * Convenience: Query persons with multiple relationships (e.g., working and enrolled).
   */
  async getPersonsWithMultipleRoles(personId: string, tenantId: string) {
    const personConfig = ENTITY_CONFIGS.person;
    const orgConfig = ENTITY_CONFIGS.organization;

    return this.execute({
      mainEntity: { config: personConfig, alias: 'p', filterFields: { strong_id: personId } },
      relationships: [
        {
          type: 'WORKS_AT',
          direction: '->',
          targetEntity: { config: orgConfig, alias: 'o_work' },
        },
        {
          type: 'ENROLLED_IN',
          direction: '->',
          targetEntity: { config: orgConfig, alias: 'o_enroll' },
        },
      ],
      returns: [
        'p',
        'labels(p) AS labels',
        'o_work.name AS worksAt',
        'o_enroll.name AS enrolledAt',
      ],
      tenantId,
      distinct: true,
    });
  }
}

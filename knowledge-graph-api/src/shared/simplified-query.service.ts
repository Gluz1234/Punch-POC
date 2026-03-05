import { Injectable, BadRequestException } from '@nestjs/common';
import { GenericQueryService, QueryBuilderConfig, EntityReference } from './generic-query.service';
import { ENTITY_CONFIGS } from './entity-config';

/**
 * Simplified Query Service
 * 
 * Provides a more intuitive API for clients to build queries without needing to send complex configs.
 * 
 * Simple syntax examples:
 * ```
 * {
 *   "entity": "person",
 *   "id": "p123",  // Optional: filter by entity ID
 *   "relationships": [
 *     { "type": "WORKS_AT", "target": "organization", "filters": { "org_id": "ORG_123" } },
 *     { "type": "HAS_SKILL", "target": "skill" }
 *   ],
 *   "tenantId": "TENANT_1",
 *   "limit": 50
 * }
 * ```
 */

export interface SimplifiedQueryConfig {
  /** Main entity type key (e.g., "person", "organization") */
  entity: string;

  /** Optional: Filter main entity by ID */
  id?: string;

  /** Optional: Filter main entity by custom fields */
  where?: Record<string, any>;

  /** Optional: Relationships to follow */
  relationships?: SimplifiedRelationship[];

  /** Optional: Tenant ID for scoping */
  tenantId?: string;

  /** Optional: Order by (e.g., "last_name") */
  orderBy?: string;

  /** Optional: Result limit (default: 1000) */
  limit?: number;

  /** Optional: Custom return fields (default: main entity + labels) */
  returns?: string[];
}

export interface SimplifiedRelationship {
  /** Relationship type (e.g., "WORKS_AT", "HAS_SKILL") */
  type: string;

  /** Direction: "->" (forward), "<-" (backward), "--" (any) */
  direction?: '->' | '<-' | '--';

  /** Target entity type (e.g., "organization") */
  target: string;

  /** Optional: Filter the target entity */
  filters?: Record<string, any>;

  /** Optional: Filter relationship properties */
  relationshipFilters?: Record<string, any>;
}

@Injectable()
export class SimplifiedQueryService {
  constructor(private readonly genericQuery: GenericQueryService) {}

  /**
   * Convert simplified query to full QueryBuilderConfig and execute.
   */
  async execute(config: SimplifiedQueryConfig) {
    const fullConfig = this.simplifyToFull(config);
    return this.genericQuery.execute(fullConfig);
  }

  /**
   * Convert SimplifiedQueryConfig to QueryBuilderConfig.
   */
  private simplifyToFull(config: SimplifiedQueryConfig): QueryBuilderConfig {
    // Get main entity config
    const entityConfig = ENTITY_CONFIGS[config.entity];
    if (!entityConfig) {
      throw new BadRequestException(`Unknown entity: ${config.entity}`);
    }

    // Build main entity reference
    const mainAlias = config.entity.charAt(0); // "person" -> "p"
    const mainEntityRef: EntityReference = {
      config: entityConfig,
      alias: mainAlias,
      filterFields: {},
    };

    // Add ID filter if provided
    if (config.id) {
      mainEntityRef.filterFields![entityConfig.idField] = config.id;
    }

    // Add custom WHERE filters
    if (config.where) {
      mainEntityRef.filterFields = { ...mainEntityRef.filterFields, ...config.where };
    }

    // Build relationships
    const relationships = [];
    if (config.relationships && config.relationships.length) {
      for (const rel of config.relationships) {
        const targetConfig = ENTITY_CONFIGS[rel.target];
        if (!targetConfig) {
          throw new BadRequestException(`Unknown target entity: ${rel.target}`);
        }

        const targetAlias = rel.target.charAt(0); // "organization" -> "o"
        relationships.push({
          type: rel.type,
          direction: rel.direction || '->',
          targetEntity: {
            config: targetConfig,
            alias: targetAlias,
            filterFields: rel.filters || {},
          },
          filters: rel.relationshipFilters || {},
        });
      }
    }

    // Build return fields (default: main entity + labels)
    let returns: string[];
    if (config.returns) {
      returns = config.returns;
    } else {
      returns = [mainAlias, `labels(${mainAlias}) AS labels`];
      
      // Auto-add target entity names if relationships exist
      if (relationships.length) {
        for (const rel of relationships) {
          const tAlias = rel.targetEntity.alias;
          returns.push(`${tAlias}.name AS ${tAlias}Name`);
        }
      }
    }

    // Build order by (default: main entity ID field)
    const orderBy = config.orderBy
      ? `${mainAlias}.${config.orderBy}`
      : `${mainAlias}.\`${entityConfig.idField}\``;

    return {
      mainEntity: mainEntityRef,
      relationships,
      returns,
      tenantId: config.tenantId,
      orderBy,
      limit: config.limit || 1000,
      distinct: relationships.length > 0, // Auto-distinct for multi-relationship queries
    };
  }

  /**
   * Convenience: Get all persons (with optional filters).
   */
  async getPersons(tenantId?: string, limit = 1000) {
    return this.execute({
      entity: 'person',
      tenantId,
      limit,
    });
  }

  /**
   * Convenience: Get persons at organization.
   */
  async getPersonsAtOrg(orgId: string, tenantId: string, limit = 1000) {
    return this.execute({
      entity: 'person',
      relationships: [
        {
          type: 'WORKS_AT',
          target: 'organization',
          filters: { org_id: orgId },
        },
      ],
      tenantId,
      limit,
    });
  }

  /**
   * Convenience: Get persons enrolled at organization.
   */
  async getPersonsEnrolledAt(orgId: string, tenantId: string, limit = 1000) {
    return this.execute({
      entity: 'person',
      relationships: [
        {
          type: 'ENROLLED_IN',
          target: 'organization',
          filters: { org_id: orgId },
        },
      ],
      tenantId,
      limit,
    });
  }

  /**
   * Convenience: Get persons with skill.
   */
  async getPersonsWithSkill(skillId: string, tenantId?: string, limit = 1000) {
    return this.execute({
      entity: 'person',
      relationships: [
        {
          type: 'HAS_SKILL',
          target: 'skill',
          filters: { skill_id: skillId },
        },
      ],
      tenantId,
      limit,
    });
  }

  /**
   * Convenience: Get person with multiple relationships.
   */
  async getPersonMultipleRelationships(
    personId: string,
    tenantId: string,
  ) {
    return this.execute({
      entity: 'person',
      id: personId,
      relationships: [
        { type: 'WORKS_AT', target: 'organization' },
        { type: 'ENROLLED_IN', target: 'organization' },
        { type: 'HAS_SKILL', target: 'skill' },
        { type: 'LIVES_IN', target: 'location' },
      ],
      tenantId,
    });
  }
}

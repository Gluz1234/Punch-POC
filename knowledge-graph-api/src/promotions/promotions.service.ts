import { Injectable, NotFoundException, BadRequestException, OnApplicationBootstrap } from '@nestjs/common';
import { Neo4jService } from '../infrastructure/neo4j/neo4j.service';
import { ENTITY_CONFIGS, EntityConfig, getAllEntities } from '../config/entity-config';
import { PromotionSchemaService } from './promotion-schema.service';
import { BUILTIN_SUBTYPES, getSubtypeDefinitionByKey } from '../config/subtype-config';
import { PromotionProjectionService } from './promotion-projection.service';
import { EntityResolutionService } from '../entities/entity-resolution.service';

const INTERNAL_PROMOTION_LABELS = new Set([
  'Entity',
  'EntitySchema',
  'SchemaProperty',
  'PromotionSubtype',
  'PromotionField',
  'MergeEvent',
]);

@Injectable()
export class PromotionsService implements OnApplicationBootstrap {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly promotionSchema: PromotionSchemaService,
    private readonly projection: PromotionProjectionService,
    private readonly resolution: EntityResolutionService,
  ) {}

  async onApplicationBootstrap() {
    console.log('📋 Initializing promotion subtypes...');
    try {
      await this.promotionSchema.registerMultipleSubtypes(BUILTIN_SUBTYPES);
      console.log('✅ Promotion subtypes initialized');
    } catch (err) {
      console.error('❌ Failed to initialize promotion subtypes:', err);
    }
  }

  // ── Resolve entity config from label ────────────────────────────────────

  private resolveEntityConfig(entityType: string): EntityConfig {
    // Try exact key match first
    const byKey = ENTITY_CONFIGS[entityType.toLowerCase()];
    if (byKey) return byKey;

    // Try label match
    const byLabel = getAllEntities().find(
      e => e.label.toLowerCase() === entityType.toLowerCase(),
    );
    if (byLabel) return byLabel;

    throw new BadRequestException(
      `Unknown entity type: "${entityType}". Available types: ${getAllEntities().map(e => e.key).join(', ')}`,
    );
  }

  // ── Read current labels on any entity ───────────────────────────────────

  async getLabels(entityType: string, entityId: string) {
    const requested = this.resolveEntityConfig(entityType);
    const response = await this.getLabelsById(entityId);
    if (response.entityType.toLowerCase() !== requested.label.toLowerCase()) {
      throw new BadRequestException(
        `entityType mismatch for ${entityId}: expected ${requested.label}, found ${response.entityType}`,
      );
    }
    return response;
  }

  async getLabelsById(entityId: string) {
    const { labels, config } = await this.getEntityNodeById(entityId);
    return { entityType: config.label, entityId, labels };
  }

  // ── Generic Promote to any subtype ──────────────────────────────────────

  async promoteToSubtype(
    entityType: string,
    entityId: string,
    subtype: string,
    properties: Record<string, any>,
  ) {
    const requested = this.resolveEntityConfig(entityType);
    const promoted = await this.promoteToSubtypeById(entityId, subtype, properties);
    if (!promoted.labels.some((label: string) => label.toLowerCase() === requested.label.toLowerCase())) {
      throw new BadRequestException(
        `entityType mismatch for ${entityId}: expected ${requested.label}`,
      );
    }
    return promoted;
  }

  async promoteToSubtypeById(
    entityId: string,
    subtype: string,
    properties: Record<string, any>,
  ) {
    const identityBefore = await this.resolution.buildMutationContextForEntity(entityId, false);
    const canonicalEntityId = identityBefore.canonicalEntityId;

    const { config } = await this.getEntityNodeById(canonicalEntityId);
    const safeIdField = this.neo4j.sanitizeIdentifier('entity_id');
    const safeSubtype = this.neo4j.sanitizeIdentifier(subtype);
    const safeProps = this.sanitizePropertyKeys(properties);

    // Ensure built-in subtype is registered (fallback)
    await this.ensureSubtypeDefinition(safeSubtype.toLowerCase());

    // Auto-register user-defined subtype
    const propertyKeys = Object.keys(safeProps);
    if (propertyKeys.length > 0) {
      try {
        await this.promotionSchema.upsertSubtypeDefinitionMerging({
          key: safeSubtype.toLowerCase(),
          label: safeSubtype,
          baseLabel: config.label,
          properties: propertyKeys,
        });
      } catch (err) {
        console.warn(`⚠ Failed to auto-register subtype "${safeSubtype}":`, err);
      }
    }

    // Build SET clauses dynamically
    const setParts = Object.keys(safeProps).map(k => `n.\`${k}\` = $prop_${k}`).join(', ');
    const setClause = setParts ? `SET ${setParts}` : '';

    const params: Record<string, any> = { entityId: canonicalEntityId };
    for (const [k, v] of Object.entries(safeProps)) {
      params[`prop_${k}`] = v;
    }

    const records = await this.neo4j.runQuery(`
      MATCH (n:Entity {\`${safeIdField}\`: $entityId})
      SET n:\`${safeSubtype}\`
      ${setClause}
      RETURN n, labels(n) AS labels`,
      params,
    );

    if (!records.length) {
      throw new NotFoundException(`${config.displayName} ${entityId} not found`);
    }

    const nodeProperties = this.neo4j.toPlainObject(records[0].get('n').properties);
    const labels = records[0].get('labels') as string[];
    const entity = await this.projection.projectTypedNode(nodeProperties, labels, canonicalEntityId);
    const identity = await this.resolution.buildMutationContextForEntity(entityId, true);

    return {
      ...entity,
      _identity: identity,
    };
  }

  // ── Generic listing: get all nodes with a given subtype label ───────────

  async getNodesBySubtype(subtype: string, tenantId?: string) {
    const safeSubtype = this.neo4j.sanitizeIdentifier(subtype);

    let cypher: string;
    let params: Record<string, any>;

    if (tenantId) {
      // Tenant-scoped: find nodes that have any relationship with this tenant
      cypher = `
        MATCH (n:\`${safeSubtype}\`)
        WHERE EXISTS((n)-[r]->() WHERE r.tenant_id = $tenantId)
           OR EXISTS(()-[r]->(n) WHERE r.tenant_id = $tenantId)
        RETURN DISTINCT n, labels(n) AS labels`;
      params = { tenantId };
    } else {
      // Global: all nodes with this subtype label
      cypher = `
        MATCH (n:\`${safeSubtype}\`)
        RETURN n, labels(n) AS labels`;
      params = {};
    }

    const records = await this.neo4j.runQuery(cypher, params);
    return Promise.all(
      records.map((r) =>
        this.projection.projectTypedNode(
          this.neo4j.toPlainObject(r.get('n').properties),
          r.get('labels') as string[],
        ),
      ),
    );
  }

  async getAllBaseTypes() {
    const subtypeDefs = await this.promotionSchema.getAllSubtypeDefinitions();
    const { subtypeLabelsByBase } = this.buildSubtypeLookups(subtypeDefs);

    const configured = getAllEntities();
    const configuredByLabel = new Map(
      configured.map((entity) => [entity.label.toLowerCase(), entity]),
    );

    const baseTypes = configured.map((entity) => {
      const subtypeLabels = Array.from(
        subtypeLabelsByBase.get(entity.label.toLowerCase()) ?? [],
      ).sort((a, b) => a.localeCompare(b));

      return {
        key: entity.key,
        label: entity.label,
        displayName: entity.displayName,
        route: entity.route,
        idField: entity.idField,
        isConfigured: true,
        subtypeCount: subtypeLabels.length,
        subtypes: subtypeLabels,
      };
    });

    for (const [baseLower, subtypeSet] of subtypeLabelsByBase.entries()) {
      if (configuredByLabel.has(baseLower)) {
        continue;
      }

      const subtypeLabels = Array.from(subtypeSet).sort((a, b) => a.localeCompare(b));
      const displayLabel = subtypeLabels.length > 0
        ? subtypeDefs.find((def) => def.baseLabel.toLowerCase() === baseLower)?.baseLabel ?? baseLower
        : baseLower;

      baseTypes.push({
        key: null,
        label: displayLabel,
        displayName: displayLabel,
        route: null,
        idField: 'entity_id',
        isConfigured: false,
        subtypeCount: subtypeLabels.length,
        subtypes: subtypeLabels,
      });
    }

    baseTypes.sort((a, b) => a.label.localeCompare(b.label));

    return {
      baseTypes,
      summary: {
        totalBaseTypes: baseTypes.length,
        configuredBaseTypes: baseTypes.filter((baseType) => baseType.isConfigured).length,
        customBaseTypes: baseTypes.filter((baseType) => !baseType.isConfigured).length,
      },
    };
  }

  async getTypesByTenant(tenantId: string) {
    const normalizedTenantId = tenantId?.trim();
    if (!normalizedTenantId) {
      throw new BadRequestException('tenantId is required');
    }

    const subtypeDefs = await this.promotionSchema.getAllSubtypeDefinitions();
    const { subtypeByLabel, baseLabelSet } = this.buildSubtypeLookups(subtypeDefs);

    const configuredByLabel = new Map(
      getAllEntities().map((entity) => [entity.label.toLowerCase(), entity]),
    );

    const labelRecords = await this.neo4j.runQuery(
      `
      MATCH (a)-[r {tenant_id: $tenantId}]->(b)
      WITH collect(DISTINCT a) + collect(DISTINCT b) AS allNodes
      UNWIND allNodes AS n
      WITH DISTINCT n, [label IN labels(n) WHERE NOT label IN $internalLabels] AS labels
      UNWIND labels AS label
      RETURN DISTINCT label
      ORDER BY label
      `,
      {
        tenantId: normalizedTenantId,
        internalLabels: Array.from(INTERNAL_PROMOTION_LABELS),
      },
    );

    const types = labelRecords.map((record) => {
      const label = String(record.get('label'));
      const lower = label.toLowerCase();
      const configuredBase = configuredByLabel.get(lower);

      if (configuredBase) {
        return {
          label,
          kind: 'base',
          key: configuredBase.key,
          route: configuredBase.route,
        };
      }

      const subtype = subtypeByLabel.get(lower);
      if (subtype) {
        return {
          label,
          kind: 'subtype',
          key: subtype.key,
          baseLabel: subtype.baseLabel,
        };
      }

      if (baseLabelSet.has(lower)) {
        return {
          label,
          kind: 'base',
          key: null,
          route: null,
        };
      }

      return {
        label,
        kind: 'unknown',
      };
    });

    return {
      tenantId: normalizedTenantId,
      types,
      summary: {
        totalTypes: types.length,
        baseTypes: types.filter((typeInfo) => typeInfo.kind === 'base').length,
        subtypes: types.filter((typeInfo) => typeInfo.kind === 'subtype').length,
        unknown: types.filter((typeInfo) => typeInfo.kind === 'unknown').length,
      },
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private sanitizePropertyKeys(dto: any): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(dto || {})) {
      if (v !== undefined && v !== null) {
        const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = v;
      }
    }
    return result;
  }

  private buildSubtypeLookups(subtypeDefs: Array<{ key: string; label: string; baseLabel: string }>) {
    const subtypeByLabel = new Map<string, { key: string; label: string; baseLabel: string }>();
    const subtypeLabelsByBase = new Map<string, Set<string>>();
    const baseLabelSet = new Set<string>();

    for (const subtypeDef of subtypeDefs) {
      const normalizedSubtype = subtypeDef.label?.trim();
      const normalizedBase = subtypeDef.baseLabel?.trim();

      if (!normalizedSubtype || !normalizedBase) {
        continue;
      }

      const subtypeLower = normalizedSubtype.toLowerCase();
      const baseLower = normalizedBase.toLowerCase();

      subtypeByLabel.set(subtypeLower, {
        key: subtypeDef.key,
        label: normalizedSubtype,
        baseLabel: normalizedBase,
      });

      if (!subtypeLabelsByBase.has(baseLower)) {
        subtypeLabelsByBase.set(baseLower, new Set<string>());
      }
      subtypeLabelsByBase.get(baseLower)?.add(normalizedSubtype);
      baseLabelSet.add(baseLower);
    }

    return {
      subtypeByLabel,
      subtypeLabelsByBase,
      baseLabelSet,
    };
  }

  private async ensureSubtypeDefinition(key: string) {
    try {
      const definition = getSubtypeDefinitionByKey(key);
      if (!definition) return;
      await this.promotionSchema.upsertSubtypeDefinition(definition);
    } catch (err) {
      console.warn(`⚠ Failed to ensure subtype "${key}" is registered:`, err);
    }
  }

  private async getEntityNodeById(entityId: string): Promise<{ labels: string[]; config: EntityConfig }> {
    const safeIdField = this.neo4j.sanitizeIdentifier('entity_id');
    const records = await this.neo4j.runQuery(
      `MATCH (n:Entity {\`${safeIdField}\`: $entityId}) RETURN labels(n) AS labels LIMIT 1`,
      { entityId },
    );

    if (!records.length) {
      throw new NotFoundException(`Entity ${entityId} not found`);
    }

    const labels: string[] = records[0].get('labels');
    const config = this.resolveEntityConfigFromLabels(labels);
    return { labels, config };
  }

  private resolveEntityConfigFromLabels(labels: string[]): EntityConfig {
    const lower = new Set(labels.map(l => l.toLowerCase()));
    const config = getAllEntities().find(e => lower.has(e.label.toLowerCase()));
    if (!config) {
      throw new BadRequestException(
        `Unable to resolve base entity type from labels: ${labels.join(', ')}`,
      );
    }
    return config;
  }
}

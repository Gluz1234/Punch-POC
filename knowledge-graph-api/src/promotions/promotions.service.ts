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
    tenantId?: string,
  ) {
    const requested = this.resolveEntityConfig(entityType);
    const promoted = await this.promoteToSubtypeById(entityId, subtype, properties, tenantId);
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
    tenantId?: string,
  ) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId is required for subtype promotion');
    }

    const identityBefore = await this.resolution.buildMutationContextForEntity(entityId, false);
    const canonicalEntityId = identityBefore.canonicalEntityId;

    const { config } = await this.getEntityNodeById(canonicalEntityId);
    const safeIdField = this.neo4j.sanitizeIdentifier('entity_id');
    const safeSubtype = this.neo4j.sanitizeIdentifier(subtype);
    const safeProps = this.sanitizePropertyKeys(properties);

    // Ensure built-in subtype is registered (fallback)
    await this.ensureSubtypeDefinition(safeSubtype.toLowerCase());

    // Fetch the subtype's own icon and allowed base labels (stored on the PromotionSubtype node)
    const subtypeDef = await this.promotionSchema.getSubtypeDefinition(safeSubtype.toLowerCase());

    // Enforce allowed base types: deny promotion if the entity's base type is not in the list
    if (subtypeDef?.allowedBaseLabels?.length) {
      const entityBaseLabel = config.label;
      const allowed = subtypeDef.allowedBaseLabels.map((l) => l.toLowerCase());
      if (!allowed.includes(entityBaseLabel.toLowerCase())) {
        throw new BadRequestException(
          `Subtype "${safeSubtype}" cannot be applied to a "${entityBaseLabel}" entity. ` +
          `Allowed base types: ${subtypeDef.allowedBaseLabels.join(', ')}.`,
        );
      }
    }

    // Auto-register user-defined subtype (merging properties, preserving icon)
    const subtypeIcon = subtypeDef?.icon ?? '❓';
    const propertyKeys = Object.keys(safeProps);
    if (propertyKeys.length > 0) {
      try {
        await this.promotionSchema.upsertSubtypeDefinitionMerging({
          key: safeSubtype.toLowerCase(),
          label: safeSubtype,
          baseLabel: config.label,
          icon: subtypeIcon,
          properties: propertyKeys,
        });
      } catch (err) {
        console.warn(`⚠ Failed to auto-register subtype "${safeSubtype}":`, err);
      }
    }

    // Build SET clauses for SubtypeInstance properties
    const setParts = Object.keys(safeProps).map(k => `si.\`${k}\` = $prop_${k}`);
    const setClause = setParts.length ? `SET ${setParts.join(', ')}` : '';

    const params: Record<string, any> = { entityId: canonicalEntityId, tenantId };
    for (const [k, v] of Object.entries(safeProps)) {
      params[`prop_${k}`] = v;
    }

    // Create or update tenant-scoped SubtypeInstance node
    const records = await this.neo4j.runQuery(`
      MATCH (n:Entity {\`${safeIdField}\`: $entityId})
      MERGE (n)-[rel:HAS_SUBTYPE_INSTANCE { tenant_id: $tenantId }]->(si:SubtypeInstance:\`${safeSubtype}\` { owner_tenant_id: $tenantId, parent_entity_id: $entityId })
      ON CREATE SET rel.created_at = datetime(), si.created_at = datetime()
      ${setClause}
      SET si.updated_at = datetime()
      WITH n, si, labels(n) AS baseLabels
      OPTIONAL MATCH (n)-[r2:HAS_SUBTYPE_INSTANCE { tenant_id: $tenantId }]->(si2:SubtypeInstance)
      RETURN n, baseLabels, collect(DISTINCT { labels: labels(si2), props: properties(si2) }) AS subtypeInstances`,
      params,
    );

    if (!records.length) {
      throw new NotFoundException(`${config.displayName} ${entityId} not found`);
    }

    const nodeProperties = this.neo4j.toPlainObject(records[0].get('n').properties);
    const baseLabels = records[0].get('baseLabels') as string[];
    const subtypeInstances = records[0].get('subtypeInstances') as any[];
    const entity = await this.projection.projectTypedNodeWithInstances(nodeProperties, baseLabels, subtypeInstances, canonicalEntityId);
    const identity = await this.resolution.buildMutationContextForEntity(entityId, true);

    return {
      ...entity,
      _identity: identity,
    };
  }

  // ── Update subtype instance properties (owner tenant only) ────────────

  async updateSubtypeInstance(
    entityId: string,
    subtype: string,
    tenantId: string,
    properties: Record<string, any>,
  ) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId is required');
    }

    const canonicalEntityId = (await this.resolution.buildMutationContextForEntity(entityId, false)).canonicalEntityId;
    const safeIdField = this.neo4j.sanitizeIdentifier('entity_id');
    const safeSubtype = this.neo4j.sanitizeIdentifier(subtype);
    const safeProps = this.sanitizePropertyKeys(properties);

    const propKeys = Object.keys(safeProps);
    if (!propKeys.length) {
      throw new BadRequestException('No properties provided to update');
    }

    const setParts = propKeys.map(k => `si.\`${k}\` = $prop_${k}`);
    const params: Record<string, any> = { entityId: canonicalEntityId, tenantId };
    for (const [k, v] of Object.entries(safeProps)) {
      params[`prop_${k}`] = v;
    }

    const records = await this.neo4j.runQuery(`
      MATCH (n:Entity {\`${safeIdField}\`: $entityId})
            -[:HAS_SUBTYPE_INSTANCE { tenant_id: $tenantId }]->
            (si:SubtypeInstance:\`${safeSubtype}\` { owner_tenant_id: $tenantId })
      SET ${setParts.join(', ')}, si.updated_at = datetime()
      RETURN n, labels(n) AS baseLabels, properties(si) AS siProps, labels(si) AS siLabels`,
      params,
    );

    if (!records.length) {
      throw new NotFoundException(
        `No ${subtype} subtype instance owned by ${tenantId} found for entity ${entityId}`,
      );
    }

    const nodeProperties = this.neo4j.toPlainObject(records[0].get('n').properties);
    const baseLabels = records[0].get('baseLabels') as string[];
    const siProps = this.neo4j.toPlainObject(records[0].get('siProps'));
    const siLabels = records[0].get('siLabels') as string[];
    return this.projection.projectTypedNodeWithInstances(
      nodeProperties,
      baseLabels,
      [{ labels: siLabels, props: siProps }],
      canonicalEntityId,
    );
  }

  // ── Delete a subtype instance (owner tenant only) ─────────────────────

  async deleteSubtypeInstance(entityId: string, subtype: string, tenantId: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId is required');
    }

    const canonicalEntityId = (await this.resolution.buildMutationContextForEntity(entityId, false)).canonicalEntityId;
    const safeIdField = this.neo4j.sanitizeIdentifier('entity_id');
    const safeSubtype = this.neo4j.sanitizeIdentifier(subtype);

    const records = await this.neo4j.runQuery(`
      MATCH (n:Entity {\`${safeIdField}\`: $entityId})
            -[rel:HAS_SUBTYPE_INSTANCE { tenant_id: $tenantId }]->
            (si:SubtypeInstance:\`${safeSubtype}\` { owner_tenant_id: $tenantId })
      DELETE rel, si
      RETURN n.entity_id AS entityId`,
      { entityId: canonicalEntityId, tenantId },
    );

    if (!records.length) {
      throw new NotFoundException(
        `No ${subtype} subtype instance owned by ${tenantId} found for entity ${entityId}`,
      );
    }

    return { deleted: true, entityId: canonicalEntityId, subtype, tenantId };
  }

  // ── Generic listing: get all nodes with a given subtype label ───────────

  async getNodesBySubtype(subtype: string, tenantId?: string) {
    const safeSubtype = this.neo4j.sanitizeIdentifier(subtype);
    const safeIdField = this.neo4j.sanitizeIdentifier('entity_id');

    let cypher: string;
    let params: Record<string, any>;

    if (tenantId) {
      // Tenant-scoped: find entities that have a SubtypeInstance of this subtype owned by this tenant
      cypher = `
        MATCH (n:Entity)-[:HAS_SUBTYPE_INSTANCE { tenant_id: $tenantId }]->(si:SubtypeInstance:\`${safeSubtype}\`)
        WITH n, labels(n) AS baseLabels
        OPTIONAL MATCH (n)-[r2:HAS_SUBTYPE_INSTANCE { tenant_id: $tenantId }]->(si2:SubtypeInstance)
        RETURN n, baseLabels, collect(DISTINCT { labels: labels(si2), props: properties(si2) }) AS subtypeInstances`;
      params = { tenantId };
    } else {
      // Global: return base entity data only (no subtype properties without tenant context)
      cypher = `
        MATCH (n:Entity)-[:HAS_SUBTYPE_INSTANCE]->(si:SubtypeInstance:\`${safeSubtype}\`)
        RETURN DISTINCT n, labels(n) AS baseLabels`;
      params = {};
    }

    const records = await this.neo4j.runQuery(cypher, params);

    if (tenantId) {
      return Promise.all(
        records.map((r) =>
          this.projection.projectTypedNodeWithInstances(
            this.neo4j.toPlainObject(r.get('n').properties),
            r.get('baseLabels') as string[],
            r.get('subtypeInstances') as any[],
          ),
        ),
      );
    }

    return Promise.all(
      records.map((r) =>
        this.projection.projectTypedNode(
          this.neo4j.toPlainObject(r.get('n').properties),
          r.get('baseLabels') as string[],
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
      const subtypeMap = subtypeLabelsByBase.get(entity.label.toLowerCase()) ?? new Map<string, { label: string; icon: string; baseLabel: string; allowedBaseLabels: string[] }>();
      const subtypes = Array.from(subtypeMap.values()).sort((a, b) => a.label.localeCompare(b.label));

      return {
        key: entity.key,
        label: entity.label,
        displayName: entity.displayName,
        route: entity.route,
        idField: entity.idField,
        icon: entity.icon,
        isConfigured: true,
        subtypeCount: subtypes.length,
        subtypes,
      };
    });

    for (const [baseLower, subtypeMap] of subtypeLabelsByBase.entries()) {
      if (configuredByLabel.has(baseLower)) {
        continue;
      }

      const subtypes = Array.from(subtypeMap.values()).sort((a, b) => a.label.localeCompare(b.label));
      const displayLabel = subtypes.length > 0
        ? subtypeDefs.find((def) => def.baseLabel.toLowerCase() === baseLower)?.baseLabel ?? baseLower
        : baseLower;

      baseTypes.push({
        key: null,
        label: displayLabel,
        displayName: displayLabel,
        route: null,
        idField: 'entity_id',
        icon: '',
        isConfigured: false,
        subtypeCount: subtypes.length,
        subtypes,
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
          icon: configuredBase.icon,
        };
      }

      const subtype = subtypeByLabel.get(lower);
      if (subtype) {
        return {
          label,
          kind: 'subtype',
          key: subtype.key,
          baseLabel: subtype.baseLabel,
          allowedBaseLabels: subtype.allowedBaseLabels,
          icon: subtype.icon,
        };
      }

      if (baseLabelSet.has(lower)) {
        return {
          label,
          kind: 'base',
          key: null,
          route: null,
          icon: '',
        };
      }

      return {
        label,
        kind: 'unknown',
        icon: '',
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

  private buildSubtypeLookups(subtypeDefs: Array<{ key: string; label: string; baseLabel: string; icon: string; allowedBaseLabels?: string[] }>) {
    const subtypeByLabel = new Map<string, { key: string; label: string; baseLabel: string; icon: string; allowedBaseLabels: string[] }>();
    const subtypeLabelsByBase = new Map<string, Map<string, { label: string; icon: string; baseLabel: string; allowedBaseLabels: string[] }>>();
    const baseLabelSet = new Set<string>();

    for (const subtypeDef of subtypeDefs) {
      const normalizedSubtype = subtypeDef.label?.trim();
      const normalizedBase = subtypeDef.baseLabel?.trim();

      if (!normalizedSubtype || !normalizedBase) {
        continue;
      }

      const subtypeLower = normalizedSubtype.toLowerCase();
      const baseLower = normalizedBase.toLowerCase();
      const allowedBaseLabels = Array.from(
        new Set((subtypeDef.allowedBaseLabels?.length ? subtypeDef.allowedBaseLabels : [normalizedBase]).filter(Boolean)),
      );

      subtypeByLabel.set(subtypeLower, {
        key: subtypeDef.key,
        label: normalizedSubtype,
        baseLabel: normalizedBase,
        icon: subtypeDef.icon ?? '',
        allowedBaseLabels,
      });

      if (!subtypeLabelsByBase.has(baseLower)) {
        subtypeLabelsByBase.set(baseLower, new Map<string, { label: string; icon: string; baseLabel: string; allowedBaseLabels: string[] }>());
      }
      subtypeLabelsByBase.get(baseLower)?.set(subtypeLower, {
        label: normalizedSubtype,
        icon: subtypeDef.icon ?? '',
        baseLabel: normalizedBase,
        allowedBaseLabels,
      });
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

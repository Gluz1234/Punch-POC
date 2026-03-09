import { Injectable, NotFoundException, BadRequestException, OnApplicationBootstrap } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { ENTITY_CONFIGS, EntityConfig, getAllEntities } from '../shared/entity-config';
import { PromotionSchemaService } from './promotion-schema.service';
import { BUILTIN_SUBTYPES, getSubtypeDefinitionByKey } from './subtype-config';
import { PromotionProjectionService } from './promotion-projection.service';

@Injectable()
export class PromotionsService implements OnApplicationBootstrap {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly promotionSchema: PromotionSchemaService,
    private readonly projection: PromotionProjectionService,
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
    const { config } = await this.getEntityNodeById(entityId);
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

    const params: Record<string, any> = { entityId };
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
    return this.projection.projectTypedNode(nodeProperties, labels, entityId);
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

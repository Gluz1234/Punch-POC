import { Injectable, BadRequestException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { ENTITY_CONFIGS, getAllEntities } from '../shared/entity-config';

@Injectable()
export class RelationshipsService {
  constructor(private readonly neo4j: Neo4jService) {}

  // ── Generic: list all relationships for any entity ──────────────────────────

  async getEntityRelationships(entityType: string, entityId: string, tenantId?: string) {
    const config = this.resolveEntityConfig(entityType);
    const safeLabel = this.neo4j.sanitizeIdentifier(config.label);
    const safeIdField = this.neo4j.sanitizeIdentifier(config.idField);
    const filter = tenantId ? 'WHERE r.tenant_id = $tenantId' : '';
    const records = await this.neo4j.runQuery(`
      MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $entityId})-[r]->(t)
      ${filter}
      RETURN type(r)       AS relType,
             r.tenant_id   AS tenant,
             labels(t)     AS targetLabels,
             properties(r) AS relProps,
             properties(t) AS targetProps`,
      { entityId, tenantId: tenantId ?? null },
    );
    return records.map(r => {
      const targetProps = this.neo4j.toPlainObject(r.get('targetProps'));
      return {
        type:         r.get('relType'),
        tenantId:     r.get('tenant'),
        targetLabels: r.get('targetLabels'),
        targetId:     this.extractId(targetProps),
        properties:   this.neo4j.toPlainObject(r.get('relProps')),
      };
    });
  }

  // ── Generic: create any relationship between any two entities ───────────

  async createRelationship(dto: {
    sourceType: string;
    sourceId: string;
    targetType: string;
    targetId: string;
    relationshipType: string;
    tenantId: string;
    properties?: Record<string, any>;
  }) {
    const srcCfg = this.resolveEntityConfig(dto.sourceType);
    const tgtCfg = this.resolveEntityConfig(dto.targetType);

    const safeRelType = this.neo4j.sanitizeIdentifier(dto.relationshipType.toUpperCase());
    const safeSrcLabel = this.neo4j.sanitizeIdentifier(srcCfg.label);
    const safeTgtLabel = this.neo4j.sanitizeIdentifier(tgtCfg.label);
    const safeSrcId = this.neo4j.sanitizeIdentifier(srcCfg.idField);
    const safeTgtId = this.neo4j.sanitizeIdentifier(tgtCfg.idField);

    // Build dynamic property SET clause from dto.properties
    const extraProps = dto.properties ?? {};
    const propKeys = Object.keys(extraProps);
    const propSetClause = propKeys.length
      ? ', ' + propKeys.map(k => `r.\`${this.neo4j.sanitizeIdentifier(k)}\` = $prop_${k}`).join(', ')
      : '';
    const propParams: Record<string, any> = {};
    for (const k of propKeys) {
      propParams[`prop_${k}`] = extraProps[k] ?? null;
    }

    await this.neo4j.runQuery(
      `MATCH (src:\`${safeSrcLabel}\` {\`${safeSrcId}\`: $sourceId})
       MATCH (tgt:\`${safeTgtLabel}\` {\`${safeTgtId}\`: $targetId})
       MERGE (src)-[r:\`${safeRelType}\` {tenant_id: $tenantId}]->(tgt)
       ON CREATE SET r.created_at = $now${propSetClause}`,
      {
        sourceId: dto.sourceId,
        targetId: dto.targetId,
        tenantId: dto.tenantId,
        now: new Date().toISOString(),
        ...propParams,
      },
    );

    return {
      created: true,
      type: safeRelType,
      source: { type: srcCfg.label, id: dto.sourceId },
      target: { type: tgtCfg.label, id: dto.targetId },
      tenantId: dto.tenantId,
      properties: extraProps,
    };
  }

  // ── Generic: delete any relationship ────────────────────────────────────

  async deleteRelationship(dto: {
    sourceType: string;
    sourceId: string;
    relationshipType: string;
    tenantId: string;
    targetType?: string;
    targetId?: string;
  }) {
    const srcCfg = this.resolveEntityConfig(dto.sourceType);
    const safeRelType = this.neo4j.sanitizeIdentifier(dto.relationshipType.toUpperCase());
    const safeSrcLabel = this.neo4j.sanitizeIdentifier(srcCfg.label);
    const safeSrcId = this.neo4j.sanitizeIdentifier(srcCfg.idField);

    let targetMatch = '()';
    const params: Record<string, any> = {
      sourceId: dto.sourceId,
      tenantId: dto.tenantId,
    };

    if (dto.targetType && dto.targetId) {
      const tgtCfg = this.resolveEntityConfig(dto.targetType);
      const safeTgtLabel = this.neo4j.sanitizeIdentifier(tgtCfg.label);
      const safeTgtId = this.neo4j.sanitizeIdentifier(tgtCfg.idField);
      targetMatch = `(tgt:\`${safeTgtLabel}\` {\`${safeTgtId}\`: $targetId})`;
      params.targetId = dto.targetId;
    }

    await this.neo4j.runQuery(
      `MATCH (src:\`${safeSrcLabel}\` {\`${safeSrcId}\`: $sourceId})
             -[r:\`${safeRelType}\` {tenant_id: $tenantId}]->${targetMatch}
       DELETE r`,
      params,
    );

    return { deleted: true, type: safeRelType, sourceId: dto.sourceId, tenantId: dto.tenantId };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private resolveEntityConfig(entityType: string) {
    const byKey = ENTITY_CONFIGS[entityType.toLowerCase()];
    if (byKey) return byKey;
    const byLabel = getAllEntities().find(
      e => e.label.toLowerCase() === entityType.toLowerCase(),
    );
    if (byLabel) return byLabel;
    throw new Error(
      `Unknown entity type: "${entityType}". Available: ${getAllEntities().map(e => e.key).join(', ')}`,
    );
  }

  private extractId(props: Record<string, any>): string {
    // Check all known ID field patterns
    for (const cfg of getAllEntities()) {
      if (props[cfg.idField]) return props[cfg.idField];
    }
    return props.id ?? props.name ?? Object.values(props)[0] ?? 'unknown';
  }
}

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { getAllEntities } from '../shared/entity-config';

@Injectable()
export class RelationshipsService {
  constructor(private readonly neo4j: Neo4jService) {}

  private static readonly CANONICAL_ID_FIELD = 'entity_id';

  // ── Generic: list all relationships for any entity ──────────────────────────

  async getEntityRelationships(entityId: string, tenantId?: string) {
    const safeIdField = this.neo4j.sanitizeIdentifier(RelationshipsService.CANONICAL_ID_FIELD);
    const filter = tenantId ? 'WHERE r.tenant_id = $tenantId' : '';
    const records = await this.neo4j.runQuery(`
      MATCH (n:Entity {\`${safeIdField}\`: $entityId})-[r]->(t)
      ${filter}
      RETURN type(r)       AS relType,
             r.tenant_id   AS tenant,
             labels(t)     AS targetLabels,
             properties(r) AS relProps,
             properties(t) AS targetProps,
             t.\`${safeIdField}\` AS targetEntityId`,
      { entityId, tenantId: tenantId ?? null },
    );
    return records.map(r => {
      const targetProps = this.neo4j.toPlainObject(r.get('targetProps'));
      return {
        type:         r.get('relType'),
        tenantId:     r.get('tenant'),
        targetLabels: r.get('targetLabels'),
        targetId:     r.get('targetEntityId') ?? this.extractId(targetProps),
        properties:   this.neo4j.toPlainObject(r.get('relProps')),
      };
    });
  }

  // ── Generic: create any relationship between any two entities ───────────

  async createRelationship(dto: {
    sourceId: string;
    targetId: string;
    relationshipType: string;
    tenantId: string;
    properties?: Record<string, any>;
    sourceType?: string;
    targetType?: string;
  }) {
    if (!dto.sourceId || !dto.targetId) {
      throw new BadRequestException('sourceId and targetId are required');
    }

    const safeRelType = this.neo4j.sanitizeIdentifier(dto.relationshipType.toUpperCase());
    const safeIdField = this.neo4j.sanitizeIdentifier(RelationshipsService.CANONICAL_ID_FIELD);

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

    const records = await this.neo4j.runQuery(
      `MATCH (src:Entity {\`${safeIdField}\`: $sourceId})
       MATCH (tgt:Entity {\`${safeIdField}\`: $targetId})
       MERGE (src)-[r:\`${safeRelType}\` {tenant_id: $tenantId}]->(tgt)
       ON CREATE SET r.created_at = $now${propSetClause}
       RETURN labels(src) AS srcLabels, labels(tgt) AS tgtLabels`,
      {
        sourceId: dto.sourceId,
        targetId: dto.targetId,
        tenantId: dto.tenantId,
        now: new Date().toISOString(),
        ...propParams,
      },
    );

    if (!records.length) {
      throw new NotFoundException('sourceId or targetId was not found');
    }

    return {
      created: true,
      type: safeRelType,
      source: { labels: records[0].get('srcLabels'), id: dto.sourceId },
      target: { labels: records[0].get('tgtLabels'), id: dto.targetId },
      tenantId: dto.tenantId,
      properties: extraProps,
    };
  }

  // ── Generic: delete any relationship ────────────────────────────────────

  async deleteRelationship(dto: {
    sourceId: string;
    relationshipType: string;
    tenantId: string;
    targetId?: string;
    sourceType?: string;
    targetType?: string;
  }) {
    const safeRelType = this.neo4j.sanitizeIdentifier(dto.relationshipType.toUpperCase());
    const safeIdField = this.neo4j.sanitizeIdentifier(RelationshipsService.CANONICAL_ID_FIELD);

    let targetFilter = '';
    const params: Record<string, any> = {
      sourceId: dto.sourceId,
      tenantId: dto.tenantId,
    };

    if (dto.targetId) {
      targetFilter = `AND tgt.\`${safeIdField}\` = $targetId`;
      params.targetId = dto.targetId;
    }

    const records = await this.neo4j.runQuery(
      `MATCH (src:Entity {\`${safeIdField}\`: $sourceId})
             -[r:\`${safeRelType}\` {tenant_id: $tenantId}]->(tgt)
       WHERE true ${targetFilter}
       WITH r
       DELETE r
       RETURN count(r) AS deletedCount`,
      params,
    );

    const deletedCount = records[0]?.get('deletedCount')?.toNumber?.() ?? 0;
    if (!deletedCount) {
      throw new NotFoundException('No matching relationship found to delete');
    }

    return {
      deleted: true,
      deletedCount,
      type: safeRelType,
      sourceId: dto.sourceId,
      tenantId: dto.tenantId,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private extractId(props: Record<string, any>): string {
    if (props.entity_id) return props.entity_id;
    // Check all known ID field patterns
    for (const cfg of getAllEntities()) {
      if (props[cfg.idField]) return props[cfg.idField];
      for (const legacyField of cfg.legacyIdFields ?? []) {
        if (props[legacyField]) return props[legacyField];
      }
    }
    return props.id ?? props.name ?? Object.values(props)[0] ?? 'unknown';
  }
}

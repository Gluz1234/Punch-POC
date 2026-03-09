import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import neo4j from 'neo4j-driver';
import { Neo4jService } from '../neo4j/neo4j.service';
import { getAllEntities } from '../shared/entity-config';
import { PromotionProjectionService } from '../promotions/promotion-projection.service';

@Injectable()
export class RelationshipsService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly projection: PromotionProjectionService,
  ) {}

  private static readonly CANONICAL_ID_FIELD = 'entity_id';

  // ── Generic: list all relationships for a tenant ─────────────────────────

  async getRelationshipsByTenant(tenantId: string, limit = 10000) {
    const normalizedLimit = this.normalizeLimit(limit);

    const records = await this.neo4j.runQuery(
      `
      MATCH (src)-[r {tenant_id: $tenantId}]->(tgt)
      RETURN src, tgt, r, type(r) AS relType,
             labels(src) AS srcLabels,
             labels(tgt) AS tgtLabels
      LIMIT $limit
      `,
      { tenantId, limit: neo4j.int(normalizedLimit) },
    );

    const relationshipsByType: Record<string, any[]> = {};

    for (const record of records) {
      const relType = record.get('relType') as string;
      const fromNode = await this.projection.projectTypedNode(
        this.neo4j.toPlainObject(record.get('src').properties),
        record.get('srcLabels') as string[],
      );
      const toNode = await this.projection.projectTypedNode(
        this.neo4j.toPlainObject(record.get('tgt').properties),
        record.get('tgtLabels') as string[],
      );

      const relationship = {
        _id: record.get('r').identity.toNumber(),
        type: relType,
        ...this.neo4j.toPlainObject(record.get('r').properties),
        from: fromNode,
        to: toNode,
      };

      if (!relationshipsByType[relType]) {
        relationshipsByType[relType] = [];
      }

      relationshipsByType[relType].push(relationship);
    }

    return {
      tenantId,
      relationshipsByType,
      statistics: {
        totalRelationships: records.length,
        relationshipTypeCount: Object.keys(relationshipsByType).length,
        perType: Object.entries(relationshipsByType).map(([type, rels]) => ({
          type,
          count: rels.length,
        })),
      },
    };
  }

  // ── Generic: list all relationships for any entity ──────────────────────────

  async getEntityRelationships(entityId: string, tenantId?: string) {
    const safeIdField = this.neo4j.sanitizeIdentifier(RelationshipsService.CANONICAL_ID_FIELD);
    const tenantFilter = tenantId ? 'AND r.tenant_id = $tenantId' : '';

    const records = await this.neo4j.runQuery(`
      MATCH (src:Entity {\`${safeIdField}\`: $entityId})-[r]->(tgt)
      WHERE true ${tenantFilter}
      RETURN src, tgt, r, type(r) AS relType,
             labels(src) AS srcLabels,
             labels(tgt) AS tgtLabels`,
      { entityId, ...(tenantId ? { tenantId } : {}) },
    );

    const relationshipsByType: Record<string, any[]> = {};

    for (const record of records) {
      const relType = record.get('relType') as string;
      const fromNode = await this.projection.projectTypedNode(
        this.neo4j.toPlainObject(record.get('src').properties),
        record.get('srcLabels') as string[],
      );
      const toNode = await this.projection.projectTypedNode(
        this.neo4j.toPlainObject(record.get('tgt').properties),
        record.get('tgtLabels') as string[],
      );

      const relationship = {
        _id: record.get('r').identity.toNumber(),
        type: relType,
        ...this.neo4j.toPlainObject(record.get('r').properties),
        from: fromNode,
        to: toNode,
      };

      if (!relationshipsByType[relType]) {
        relationshipsByType[relType] = [];
      }

      relationshipsByType[relType].push(relationship);
    }

    return {
      entityId,
      ...(tenantId ? { tenantId } : {}),
      relationshipsByType,
      statistics: {
        totalRelationships: records.length,
        relationshipTypeCount: Object.keys(relationshipsByType).length,
        perType: Object.entries(relationshipsByType).map(([type, rels]) => ({
          type,
          count: rels.length,
        })),
      },
    };
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

  private normalizeLimit(limit: number): number {
    if (!Number.isFinite(limit)) {
      throw new BadRequestException('limit must be numeric');
    }

    const normalized = Math.floor(limit);
    if (normalized < 0) {
      throw new BadRequestException('limit must be a non-negative integer');
    }

    return normalized;
  }

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

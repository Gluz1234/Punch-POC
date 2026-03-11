import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import neo4j from 'neo4j-driver';
import { Neo4jService } from '../infrastructure/neo4j/neo4j.service';
import { getAllEntities } from '../config/entity-config';
import { PromotionProjectionService } from '../promotions/promotion-projection.service';
import { EntityResolutionService } from '../entities/entity-resolution.service';

@Injectable()
export class RelationshipsService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly projection: PromotionProjectionService,
    private readonly resolution: EntityResolutionService,
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

    const requestedSourceId = dto.sourceId;
    const requestedTargetId = dto.targetId;
    const sourceId = await this.resolution.resolveCanonicalEntityIdIfExists(requestedSourceId);
    const targetId = await this.resolution.resolveCanonicalEntityIdIfExists(requestedTargetId);

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
        sourceId,
        targetId,
        tenantId: dto.tenantId,
        now: new Date().toISOString(),
        ...propParams,
      },
    );

    if (!records.length) {
      throw new NotFoundException('sourceId or targetId was not found');
    }

    const identity = await this.resolution.buildMutationContextForPair(
      requestedSourceId,
      requestedTargetId,
      true,
    );

    return {
      created: true,
      type: safeRelType,
      source: {
        labels: records[0].get('srcLabels'),
        id: sourceId,
        requestedId: requestedSourceId,
      },
      target: {
        labels: records[0].get('tgtLabels'),
        id: targetId,
        requestedId: requestedTargetId,
      },
      tenantId: dto.tenantId,
      properties: extraProps,
      _identity: identity,
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
    const requestedSourceId = dto.sourceId;
    const sourceId = await this.resolution.resolveCanonicalEntityIdIfExists(requestedSourceId);

    const safeRelType = this.neo4j.sanitizeIdentifier(dto.relationshipType.toUpperCase());
    const safeIdField = this.neo4j.sanitizeIdentifier(RelationshipsService.CANONICAL_ID_FIELD);

    let targetFilter = '';
    const params: Record<string, any> = {
      sourceId,
      tenantId: dto.tenantId,
    };

    let requestedTargetId: string | undefined;
    let targetId: string | undefined;

    if (dto.targetId) {
      requestedTargetId = dto.targetId;
      targetId = await this.resolution.resolveCanonicalEntityIdIfExists(requestedTargetId);
      targetFilter = `AND tgt.\`${safeIdField}\` = $targetId`;
      params.targetId = targetId;
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

    const identity: Record<string, any> = {
      source: await this.resolution.buildMutationContextForEntity(requestedSourceId, false),
    };

    if (requestedTargetId) {
      identity.target = await this.resolution.buildMutationContextForEntity(requestedTargetId, false);
    }

    return {
      deleted: true,
      deletedCount,
      type: safeRelType,
      sourceId,
      requestedSourceId,
      ...(targetId ? { targetId, requestedTargetId } : {}),
      tenantId: dto.tenantId,
      _identity: identity,
    };
  }

  // ── Delete all tenant-scoped relationships on an entity ─────────────────

  async deleteAllEntityRelationshipsForTenant(
    entityId: string,
    tenantId: string,
  ) {
    if (!entityId?.trim()) {
      throw new BadRequestException('entityId is required');
    }
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId is required');
    }

    const canonicalEntityId =
      await this.resolution.resolveCanonicalEntityIdIfExists(entityId);
    const safeIdField = this.neo4j.sanitizeIdentifier(
      RelationshipsService.CANONICAL_ID_FIELD,
    );

    // Delete both outgoing AND incoming relationships on this entity
    // that carry the given tenant_id.
    const records = await this.neo4j.runQuery(
      `
      MATCH (n:Entity {\`${safeIdField}\`: $entityId})
      OPTIONAL MATCH (n)-[r1 {tenant_id: $tenantId}]->()
      OPTIONAL MATCH ()-[r2 {tenant_id: $tenantId}]->(n)
      WITH n, collect(r1) + collect(r2) AS rels
      FOREACH (r IN rels | DELETE r)
      RETURN size(rels) AS deletedCount
      `,
      { entityId: canonicalEntityId, tenantId },
    );

    const deletedCount =
      records[0]?.get('deletedCount')?.toNumber?.() ?? 0;

    const identity = await this.resolution.buildMutationContextForEntity(
      entityId,
      false,
    );

    return {
      deleted: true,
      deletedCount,
      entityId: canonicalEntityId,
      requestedEntityId: entityId,
      tenantId,
      _identity: identity,
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

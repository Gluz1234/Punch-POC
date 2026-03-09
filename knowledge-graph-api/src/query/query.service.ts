import { Injectable, BadRequestException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { ENTITY_CONFIGS, getAllEntities } from '../shared/entity-config';

@Injectable()
export class QueryService {
  constructor(private readonly neo4j: Neo4jService) {}

  // ── Generic: find entities connected by a relationship ─────────────────

  async getEntitiesByRelationship(
    sourceType: string,
    targetType: string,
    relationshipType: string,
    targetId: string,
    tenantId?: string,
  ) {
    const srcCfg = this.resolveEntityConfig(sourceType);
    const tgtCfg = this.resolveEntityConfig(targetType);

    const safeSrcLabel = this.neo4j.sanitizeIdentifier(srcCfg.label);
    const safeTgtLabel = this.neo4j.sanitizeIdentifier(tgtCfg.label);
    const safeTgtId = this.neo4j.sanitizeIdentifier(tgtCfg.idField);
    const safeRelType = this.neo4j.sanitizeIdentifier(relationshipType.toUpperCase());

    const tenantFilter = tenantId ? `{tenant_id: $tenantId}` : '';
    const records = await this.neo4j.runQuery(`
      MATCH (src:\`${safeSrcLabel}\`)-[r:\`${safeRelType}\` ${tenantFilter}]->(tgt:\`${safeTgtLabel}\` {\`${safeTgtId}\`: $targetId})
      RETURN src, labels(src) AS labels, properties(r) AS relProps
      ORDER BY src.\`${srcCfg.idField}\``,
      { targetId, tenantId: tenantId ?? null },
    );
    return records.map(r => ({
      entity: { ...this.neo4j.toPlainObject(r.get('src').properties), labels: r.get('labels') },
      relationship: this.neo4j.toPlainObject(r.get('relProps')),
    }));
  }

  // ── Generic: cross-tenant query ────────────────────────────────────────

  async getCrossTenantEntities(
    entityType: string,
    relationshipType: string,
    targetTypeA: string,
    targetIdA: string,
    tenantA: string,
    targetTypeB: string,
    targetIdB: string,
    tenantB: string,
  ) {
    const entityCfg = this.resolveEntityConfig(entityType);
    const tgtCfgA = this.resolveEntityConfig(targetTypeA);
    const tgtCfgB = this.resolveEntityConfig(targetTypeB);

    const safeEntityLabel = this.neo4j.sanitizeIdentifier(entityCfg.label);
    const safeTgtLabelA = this.neo4j.sanitizeIdentifier(tgtCfgA.label);
    const safeTgtIdA = this.neo4j.sanitizeIdentifier(tgtCfgA.idField);
    const safeTgtLabelB = this.neo4j.sanitizeIdentifier(tgtCfgB.label);
    const safeTgtIdB = this.neo4j.sanitizeIdentifier(tgtCfgB.idField);
    const safeRelType = this.neo4j.sanitizeIdentifier(relationshipType.toUpperCase());

    const records = await this.neo4j.runQuery(`
      MATCH (e:\`${safeEntityLabel}\`)-[r1:\`${safeRelType}\` {tenant_id: $tenantA}]->(a:\`${safeTgtLabelA}\` {\`${safeTgtIdA}\`: $targetIdA})
      MATCH (e)-[r2:\`${safeRelType}\` {tenant_id: $tenantB}]->(b:\`${safeTgtLabelB}\` {\`${safeTgtIdB}\`: $targetIdB})
      WHERE a.\`${tgtCfgA.idField}\` <> b.\`${tgtCfgB.idField}\`
      RETURN e, labels(e) AS labels,
             properties(r1) AS relPropsA, a.name AS nameA,
             properties(r2) AS relPropsB, b.name AS nameB
      ORDER BY e.\`${entityCfg.idField}\``,
      { targetIdA, tenantA, targetIdB, tenantB });
    return records.map(r => ({
      entity: { ...this.neo4j.toPlainObject(r.get('e').properties), labels: r.get('labels') },
      connectionA: { name: r.get('nameA'), tenant: tenantA, properties: this.neo4j.toPlainObject(r.get('relPropsA')) },
      connectionB: { name: r.get('nameB'), tenant: tenantB, properties: this.neo4j.toPlainObject(r.get('relPropsB')) },
    }));
  }

  // ── Generic: get tenants for any entity ─────────────────────────────────

  async getTenantsForEntity(entityId: string) {
    const safeIdField = this.neo4j.sanitizeIdentifier('entity_id');
    const records = await this.neo4j.runQuery(`
      MATCH (n:Entity {\`${safeIdField}\`: $entityId})-[r]->()
      WHERE r.tenant_id IS NOT NULL
      RETURN DISTINCT r.tenant_id AS tenant ORDER BY tenant`,
      { entityId });
    return records.map(r => r.get('tenant'));
  }

  // ── Generic: get nodes by label ─────────────────────────────────────────

  async getNodesByLabel(label: string, tenantId?: string) {
    const safeLabel = this.neo4j.sanitizeIdentifier(label);
    let records: any[];

    if (tenantId) {
      records = await this.neo4j.runQuery(
        `MATCH (n:\`${safeLabel}\`)-[r]->()
         WHERE r.tenant_id = $tenantId
         RETURN DISTINCT n, labels(n) AS labels`,
        { tenantId },
      );
    } else {
      records = await this.neo4j.runQuery(
        `MATCH (n:\`${safeLabel}\`) RETURN n, labels(n) AS labels`,
      );
    }
    return records.map(r => ({
      ...this.neo4j.toPlainObject(r.get('n').properties),
      labels: r.get('labels'),
    }));
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private resolveEntityConfig(entityType: string) {
    const byKey = ENTITY_CONFIGS[entityType.toLowerCase()];
    if (byKey) return byKey;
    const byLabel = getAllEntities().find(
      e => e.label.toLowerCase() === entityType.toLowerCase(),
    );
    if (byLabel) return byLabel;
    throw new BadRequestException(
      `Unknown entity type: "${entityType}". Available: ${getAllEntities().map(e => e.key).join(', ')}`,
    );
  }
}

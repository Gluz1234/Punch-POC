import { BadRequestException, Injectable } from '@nestjs/common';
import neo4j from 'neo4j-driver';
import { Neo4jService } from '../infrastructure/neo4j/neo4j.service';
import { SchemaService } from '../schema/schema.service';
import { PromotionProjectionService } from '../promotions/promotion-projection.service';

const INTERNAL_NODE_LABELS = new Set([
  'Entity',
  'EntitySchema',
  'SchemaProperty',
  'PromotionSubtype',
  'PromotionField',
]);

@Injectable()
export class DataService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly schemaService: SchemaService,
    private readonly projection: PromotionProjectionService,
  ) {}

  /**
   * Fetch all nodes connected on the same tenant ID.
   * Returns nodes grouped by label with their properties and types.
   */
  async getAllNodesByTenant(tenantId: string, limit = 10000) {
    // Collect all unique nodes from tenant relationships (same pattern as getRelationshipsByTenant)
    const records = await this.neo4j.runQuery(`
      MATCH (a)-[r {tenant_id: $tenantId}]->(b)
      WITH collect(DISTINCT a) + collect(DISTINCT b) AS allNodes
      UNWIND allNodes AS n
      WITH DISTINCT n
      RETURN n, labels(n) AS labels
      LIMIT $limit
    `, { tenantId, limit: neo4j.int(limit) });

    const nodesByLabel: Record<string, any[]> = {};

    for (const record of records) {
      const nodeLabels: string[] = (record.get('labels') as string[])
        .filter(label => !INTERNAL_NODE_LABELS.has(label));

      if (!nodeLabels.length) {
        continue;
      }

      const node = await this.projection.projectTypedNode(
        this.neo4j.toPlainObject(record.get('n').properties),
        nodeLabels,
      );

      for (const label of nodeLabels) {
        if (!nodesByLabel[label]) {
          nodesByLabel[label] = [];
        }
        nodesByLabel[label].push(node);
      }
    }

    return {
      tenantId,
      nodesByLabel,
      statistics: {
        labelsWithData: Object.keys(nodesByLabel).length,
        totalNodes: records.length,
      },
    };
  }

  /**
   * Fetch all nodes and relationships in the database.
   * Returns complete graph data with typed properties.
   */
  async getAllData(limit = 10000) {
    // Get all labels and relationship types
    const [allLabels, relTypes, subtypesResult] = await Promise.all([
      this.schemaService.getLabels(false),
      this.schemaService.getRelationshipTypes(),
      this.schemaService.getAllSubtypes(),
    ]);

    // Build a set of subtype labels so they are not fetched as top-level buckets.
    // Promoted nodes (e.g. Person:Student) already appear under their base type label.
    const subtypeLabelSet = new Set(
      subtypesResult.nodeLabels.map((s: any) => s.label as string),
    );
    const labels = allLabels.filter(l => !subtypeLabelSet.has(l));

    const nodesByLabel: Record<string, any[]> = {};
    const relationships: any[] = [];

    // Fetch all nodes by label
    for (const label of labels) {
      try {
        const safeLabel = this.neo4j.sanitizeIdentifier(label);

        // Get schema for this label first
        const schema = await this.schemaService.getPropertiesForLabel(label);

        const records = await this.neo4j.runQuery(`
          MATCH (n:\`${safeLabel}\`)
          RETURN n, labels(n) AS labels
          LIMIT $limit
        `, { limit: neo4j.int(limit) });

        if (records.length > 0) {
          nodesByLabel[label] = await Promise.all(
            records.map((r) =>
              this.projection.projectTypedNode(
                this.neo4j.toPlainObject(r.get('n').properties),
                r.get('labels') as string[],
              ),
            ),
          );
        }
      } catch (error) {
        console.warn(`⚠ Failed to fetch nodes for label ${label}:`, error.message);
      }
    }

    // Fetch all relationships
    try {
      const relRecords = await this.neo4j.runQuery(`
        MATCH (a)-[r]->(b)
        RETURN a, b, r, type(r) AS relType,
               labels(a) AS aLabels, labels(b) AS bLabels
        LIMIT $limit
      `, { limit: neo4j.int(limit) });

      const relMap: Record<string, any> = {};
      for (const record of relRecords) {
        const relType = record.get('relType');
        const fromNode = await this.projection.projectTypedNode(
          this.neo4j.toPlainObject(record.get('a').properties),
          record.get('aLabels') as string[],
        );
        const toNode = await this.projection.projectTypedNode(
          this.neo4j.toPlainObject(record.get('b').properties),
          record.get('bLabels') as string[],
        );

        const rel = {
          _id: record.get('r').identity.toNumber(),
          type: relType,
          ...this.neo4j.toPlainObject(record.get('r').properties),
          from: fromNode,
          to: toNode,
        };

        if (!relMap[relType]) {
          relMap[relType] = [];
        }
        relMap[relType].push(rel);
      }

      // Reorganize relationships by type
      for (const [type, rels] of Object.entries(relMap)) {
        relationships.push({
          type,
          count: (rels as any[]).length,
          relationships: rels,
        });
      }
    } catch (error) {
      console.warn(`⚠ Failed to fetch relationships:`, error.message);
    }

    return {
      nodesByLabel,
      relationships,
      statistics: {
        totalLabels: labels.length,
        labelsWithData: Object.keys(nodesByLabel).length,
        totalNodes: Object.values(nodesByLabel).reduce((sum, nodes) => sum + nodes.length, 0),
        totalRelationshipTypes: relTypes.length,
        relationshipsPerType: relationships.map(r => ({ type: r.type, count: r.count })),
      },
    };
  }

  /**
   * Fetch all relationships for a specific tenant ID.
   */
  async getRelationshipsByTenant(tenantId: string, limit = 10000) {
    const records = await this.neo4j.runQuery(`
      MATCH (a)-[r {tenant_id: $tenantId}]->(b)
      RETURN a, b, r, type(r) AS relType,
             labels(a) AS aLabels, labels(b) AS bLabels
      LIMIT $limit
    `, { tenantId, limit: neo4j.int(limit) });

    const relationshipsByType: Record<string, any[]> = {};

    for (const record of records) {
      const relType = record.get('relType');
      const fromNode = await this.projection.projectTypedNode(
        this.neo4j.toPlainObject(record.get('a').properties),
        record.get('aLabels') as string[],
      );
      const toNode = await this.projection.projectTypedNode(
        this.neo4j.toPlainObject(record.get('b').properties),
        record.get('bLabels') as string[],
      );

      const rel = {
        _id: record.get('r').identity.toNumber(),
        type: relType,
        ...this.neo4j.toPlainObject(record.get('r').properties),
        from: fromNode,
        to: toNode,
      };

      if (!relationshipsByType[relType]) {
        relationshipsByType[relType] = [];
      }
      relationshipsByType[relType].push(rel);
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

  /**
   * Restore snapshot exported from GET /api/data/all.
   * Upserts nodes by entity_id and upserts relationships by (from, type, to).
   */
  async restoreAllData(payload: any) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('Payload must be an object in the same shape as GET /api/data/all');
    }

    const nodesByLabel = payload.nodesByLabel;
    const relationshipGroups = payload.relationships;

    if (!nodesByLabel || typeof nodesByLabel !== 'object' || Array.isArray(nodesByLabel)) {
      throw new BadRequestException('Payload.nodesByLabel must be an object');
    }
    if (relationshipGroups !== undefined && !Array.isArray(relationshipGroups)) {
      throw new BadRequestException('Payload.relationships must be an array when provided');
    }

    const safeEntityIdField = this.neo4j.sanitizeIdentifier('entity_id');
    const aggregatedNodes = this.collectSnapshotNodes(nodesByLabel);

    let nodesUpserted = 0;
    let nodesSkipped = 0;

    for (const node of aggregatedNodes.values()) {
      if (!node.entityId) {
        nodesSkipped += 1;
        continue;
      }

      const safeLabels = Array.from(node.labels)
        .filter((label) => !INTERNAL_NODE_LABELS.has(label))
        .map((label) => this.neo4j.sanitizeIdentifier(label));

      if (!safeLabels.length) {
        nodesSkipped += 1;
        continue;
      }

      const labelClause = safeLabels.map((label) => `:\`${label}\``).join('');
      const properties = {
        ...node.properties,
        entity_id: node.entityId,
      };

      await this.neo4j.runQuery(
        `
        MERGE (n:Entity {\`${safeEntityIdField}\`: $entityId})
        SET n += $properties
        SET n${labelClause}
        RETURN n
        `,
        {
          entityId: node.entityId,
          properties,
        },
      );

      nodesUpserted += 1;
    }

    const relationshipEntries = this.flattenRelationshipEntries(relationshipGroups ?? []);
    let relationshipsUpserted = 0;
    let relationshipsSkipped = 0;

    for (const entry of relationshipEntries) {
      const relationshipType = typeof entry.relationship?.type === 'string' && entry.relationship.type.trim()
        ? entry.relationship.type.trim()
        : entry.groupType;

      if (!relationshipType) {
        relationshipsSkipped += 1;
        continue;
      }

      const safeType = this.neo4j.sanitizeIdentifier(relationshipType);
      const fromId = this.extractEntityIdFromProjection(entry.relationship?.from);
      const toId = this.extractEntityIdFromProjection(entry.relationship?.to);

      if (!fromId || !toId) {
        relationshipsSkipped += 1;
        continue;
      }

      const relationshipProps = this.extractRelationshipProperties(entry.relationship);

      const relResult = await this.neo4j.runQuery(
        `
        MATCH (a:Entity {\`${safeEntityIdField}\`: $fromId})
        MATCH (b:Entity {\`${safeEntityIdField}\`: $toId})
        MERGE (a)-[r:\`${safeType}\`]->(b)
        SET r += $props
        RETURN r
        `,
        {
          fromId,
          toId,
          props: relationshipProps,
        },
      );

      if (!relResult.length) {
        relationshipsSkipped += 1;
        continue;
      }

      relationshipsUpserted += 1;
    }

    return {
      restored: true,
      statistics: {
        inputLabels: Object.keys(nodesByLabel).length,
        inputRelationshipGroups: Array.isArray(relationshipGroups) ? relationshipGroups.length : 0,
        nodesUpserted,
        nodesSkipped,
        relationshipsUpserted,
        relationshipsSkipped,
      },
    };
  }

  /**
   * Helper to get the ID field name for a label.
   * Returns the first matching ID field from entity config.
   */
  private _getIdFieldForLabel(label: string): string | null {
    const idFieldMap: Record<string, string> = {
      Person: 'entity_id',
      Organization: 'entity_id',
      Location: 'entity_id',
      Skill: 'entity_id',
      Education: 'entity_id',
      Course: 'entity_id',
      Department: 'entity_id',
    };
    return idFieldMap[label] || null;
  }

  private collectSnapshotNodes(nodesByLabel: Record<string, any>): Map<string, { entityId: string | null; labels: Set<string>; properties: Record<string, any> }> {
    const out = new Map<string, { entityId: string | null; labels: Set<string>; properties: Record<string, any> }>();

    for (const [bucketLabel, nodes] of Object.entries(nodesByLabel ?? {})) {
      if (!Array.isArray(nodes)) {
        continue;
      }

      for (const node of nodes) {
        const normalized = this.normalizeSnapshotNode(node, bucketLabel);
        if (!normalized) {
          continue;
        }

        if (!normalized.entityId) {
          continue;
        }

        const existing = out.get(normalized.entityId);
        if (!existing) {
          out.set(normalized.entityId, {
            entityId: normalized.entityId,
            labels: new Set(normalized.labels),
            properties: { ...normalized.properties },
          });
          continue;
        }

        for (const label of normalized.labels) {
          existing.labels.add(label);
        }
        Object.assign(existing.properties, normalized.properties);
      }
    }

    return out;
  }

  private normalizeSnapshotNode(node: any, bucketLabel: string): { entityId: string | null; labels: string[]; properties: Record<string, any> } | null {
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      return null;
    }

    const labels = new Set<string>();
    if (typeof bucketLabel === 'string' && bucketLabel.trim()) {
      labels.add(bucketLabel.trim());
    }
    if (typeof node.entityType === 'string' && node.entityType.trim()) {
      labels.add(node.entityType.trim());
    }
    if (Array.isArray(node.labels)) {
      for (const label of node.labels) {
        if (typeof label === 'string' && label.trim()) {
          labels.add(label.trim());
        }
      }
    }
    if (typeof node.base?.label === 'string' && node.base.label.trim()) {
      labels.add(node.base.label.trim());
    }

    const properties: Record<string, any> = {};

    const mergeProps = (obj: any) => {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        return;
      }
      for (const [key, value] of Object.entries(obj)) {
        if (value === undefined) {
          continue;
        }
        properties[key] = value;
      }
    };

    if (node.base?.properties) {
      mergeProps(node.base.properties);
    }

    if (Array.isArray(node.subtypes)) {
      for (const subtype of node.subtypes) {
        if (typeof subtype?.label === 'string' && subtype.label.trim()) {
          labels.add(subtype.label.trim());
        }
        mergeProps(subtype?.properties);
      }
    }

    mergeProps(node.unknownProperties);

    // Support plain-node snapshots by keeping non-envelope keys
    const reserved = new Set([
      '_id',
      'entityType',
      'entityId',
      'labels',
      'icon',
      'base',
      'subtypes',
      'unknownProperties',
      'from',
      'to',
      'type',
      'count',
      'relationships',
    ]);

    for (const [key, value] of Object.entries(node)) {
      if (reserved.has(key) || value === undefined) {
        continue;
      }
      properties[key] = value;
    }

    const entityId = this.extractEntityIdFromProjection({
      ...node,
      base: { ...(node.base ?? {}), properties: { ...(node.base?.properties ?? {}), ...properties } },
      labels: Array.from(labels),
    });

    return {
      entityId,
      labels: Array.from(labels),
      properties,
    };
  }

  private flattenRelationshipEntries(groups: any[]): Array<{ groupType: string | null; relationship: any }> {
    const out: Array<{ groupType: string | null; relationship: any }> = [];

    for (const group of Array.isArray(groups) ? groups : []) {
      const groupType = typeof group?.type === 'string' && group.type.trim() ? group.type.trim() : null;

      if (Array.isArray(group?.relationships)) {
        for (const relationship of group.relationships) {
          out.push({ groupType, relationship });
        }
        continue;
      }

      // Also allow flat relationship arrays for flexibility
      if (group && typeof group === 'object' && (group.from || group.to)) {
        out.push({ groupType, relationship: group });
      }
    }

    return out;
  }

  private extractRelationshipProperties(relationship: any): Record<string, any> {
    const props: Record<string, any> = {};
    if (!relationship || typeof relationship !== 'object' || Array.isArray(relationship)) {
      return props;
    }

    const reserved = new Set(['_id', 'type', 'from', 'to']);
    for (const [key, value] of Object.entries(relationship)) {
      if (reserved.has(key) || value === undefined) {
        continue;
      }
      props[key] = value;
    }

    return props;
  }

  private extractEntityIdFromProjection(node: any): string | null {
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      return null;
    }

    const tryValue = (value: any): string | null => {
      if (value === undefined || value === null) {
        return null;
      }
      const str = String(value).trim();
      return str.length ? str : null;
    };

    const direct = tryValue(node.entityId);
    if (direct) {
      return direct;
    }

    const baseProps = node.base?.properties;
    const baseEntityId = tryValue(baseProps?.entity_id);
    if (baseEntityId) {
      return baseEntityId;
    }

    const baseId = tryValue(baseProps?.id);
    if (baseId) {
      return baseId;
    }

    const merged: Record<string, any> = {
      ...(baseProps && typeof baseProps === 'object' && !Array.isArray(baseProps) ? baseProps : {}),
      ...(node.unknownProperties && typeof node.unknownProperties === 'object' && !Array.isArray(node.unknownProperties) ? node.unknownProperties : {}),
    };

    if (Array.isArray(node.subtypes)) {
      for (const subtype of node.subtypes) {
        if (subtype?.properties && typeof subtype.properties === 'object' && !Array.isArray(subtype.properties)) {
          Object.assign(merged, subtype.properties);
        }
      }
    }

    const idLikeKey = Object.keys(merged).find((key) => /_id$/i.test(key));
    if (idLikeKey) {
      const idLikeValue = tryValue(merged[idLikeKey]);
      if (idLikeValue) {
        const firstLabel = Array.isArray(node.labels) && node.labels.length ? String(node.labels[0]) : String(node.entityType ?? node.base?.label ?? 'Entity');
        return `${firstLabel}|${idLikeKey}|${idLikeValue}`;
      }
    }

    return null;
  }

}

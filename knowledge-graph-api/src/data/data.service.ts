import { Injectable } from '@nestjs/common';
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

}

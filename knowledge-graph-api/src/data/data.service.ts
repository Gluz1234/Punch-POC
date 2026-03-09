import { Injectable } from '@nestjs/common';
import neo4j from 'neo4j-driver';
import { Neo4jService } from '../neo4j/neo4j.service';
import { SchemaService } from '../schema/schema.service';

@Injectable()
export class DataService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly schemaService: SchemaService,
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
      const nodeLabels: string[] = record.get('labels');
      const node = {
        _id: record.get('n').identity.toNumber(),
        ...this.neo4j.toPlainObject(record.get('n').properties),
        labels: nodeLabels,
      };

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
    const labels = await this.schemaService.getLabels();
    const relTypes = await this.schemaService.getRelationshipTypes();

    const nodesByLabel: Record<string, any[]> = {};
    const labelSchemas: Record<string, any> = {};
    const relationships: any[] = [];
    const relationshipSchemas: Record<string, any> = {};

    // Fetch all nodes by label
    for (const label of labels) {
      try {
        const safeLabel = this.neo4j.sanitizeIdentifier(label);

        // Get schema for this label first
        const schema = await this.schemaService.getPropertiesForLabel(label);
        labelSchemas[label] = schema;

        const records = await this.neo4j.runQuery(`
          MATCH (n:\`${safeLabel}\`)
          RETURN n, labels(n) AS labels
          LIMIT $limit
        `, { limit: neo4j.int(limit) });

        if (records.length > 0) {
          nodesByLabel[label] = records.map(r => {
            const allProps = this.neo4j.toPlainObject(r.get('n').properties);
            const nodeLabels = r.get('labels');
            
            // Filter properties based on schema for this specific label
            const filteredProps = this._filterPropertiesBySchema(allProps, schema);
            
            return {
              _id: r.get('n').identity.toNumber(),
              ...filteredProps,
              labels: nodeLabels,
            };
          });
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
        const rel = {
          _id: record.get('r').identity.toNumber(),
          type: relType,
          ...this.neo4j.toPlainObject(record.get('r').properties),
          from: {
            _id: record.get('a').identity.toNumber(),
            labels: record.get('aLabels'),
            ...this.neo4j.toPlainObject(record.get('a').properties),
          },
          to: {
            _id: record.get('b').identity.toNumber(),
            labels: record.get('bLabels'),
            ...this.neo4j.toPlainObject(record.get('b').properties),
          },
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

    // Get schemas for relationship types
    for (const relType of relTypes) {
      try {
        const schema = await this.schemaService.getPropertiesForRelType(relType);
        relationshipSchemas[relType] = schema;
      } catch (error) {
        console.warn(`⚠ Failed to fetch schema for relationship type ${relType}:`, error.message);
      }
    }

    return {
      nodesByLabel,
      labelSchemas,
      relationships,
      relationshipSchemas,
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
      const rel = {
        _id: record.get('r').identity.toNumber(),
        type: relType,
        ...this.neo4j.toPlainObject(record.get('r').properties),
        from: {
          _id: record.get('a').identity.toNumber(),
          labels: record.get('aLabels'),
          ...this.neo4j.toPlainObject(record.get('a').properties),
        },
        to: {
          _id: record.get('b').identity.toNumber(),
          labels: record.get('bLabels'),
          ...this.neo4j.toPlainObject(record.get('b').properties),
        },
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

  /**
   * Filter node properties to only include those defined in the label's schema.
   * This prevents subtype properties from appearing when viewing nodes by a specific label.
   */
  private _filterPropertiesBySchema(properties: Record<string, any>, schema: any): Record<string, any> {
    if (!schema || !schema.properties || schema.properties.length === 0) {
      // If no schema available, return all properties
      return properties;
    }

    const allowedProps = new Set(schema.properties.map((p: any) => p.name));
    const filtered: Record<string, any> = {};

    for (const [key, value] of Object.entries(properties)) {
      if (allowedProps.has(key)) {
        filtered[key] = value;
      }
    }

    return filtered;
  }
}

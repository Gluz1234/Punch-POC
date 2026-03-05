import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class SchemaService {
  constructor(private readonly neo4j: Neo4jService) {}

  async getLabels(): Promise<string[]> {
    const records = await this.neo4j.runQuery(
      'CALL db.labels() YIELD label RETURN label ORDER BY label',
    );
    return records.map(r => r.get('label'));
  }

  async getRelationshipTypes(): Promise<string[]> {
    const records = await this.neo4j.runQuery(
      'CALL db.relationshipTypes() YIELD relationshipType RETURN relationshipType ORDER BY relationshipType',
    );
    return records.map(r => r.get('relationshipType'));
  }

  async getConstraints() {
    const records = await this.neo4j.runQuery('SHOW CONSTRAINTS');
    return records.map(r => ({
      name:          r.get('name'),
      type:          r.get('type'),
      entityType:    r.get('entityType'),
      labelsOrTypes: r.get('labelsOrTypes'),
      properties:    r.get('properties'),
    }));
  }

  async getIndexes() {
    const records = await this.neo4j.runQuery('SHOW INDEXES');
    return records.map(r => ({
      name:          r.get('name'),
      type:          r.get('type'),
      state:         r.get('state'),
      labelsOrTypes: r.get('labelsOrTypes'),
      properties:    r.get('properties'),
    }));
  }

  async getPropertiesForLabel(label: string) {
    const safeLabel = this.neo4j.sanitizeIdentifier(label);
    
    // Get distinct property keys
    const keyRecords = await this.neo4j.runQuery(
      `MATCH (n:\`${safeLabel}\`) WITH n LIMIT 100
       UNWIND keys(n) AS key
       RETURN DISTINCT key ORDER BY key`,
    );
    const properties = keyRecords.map(r => r.get('key'));
    
    // Get property types using APOC
    const typeRecords = await this.neo4j.runQuery(
      `CALL apoc.meta.data() YIELD label, property, type
       WHERE label = $label
       RETURN property, type ORDER BY property`,
      { label }
    );
    
    // Create a map of property -> type
    const typeMap: Record<string, string> = {};
    typeRecords.forEach(r => {
      typeMap[r.get('property')] = r.get('type');
    });
    
    // Combine keys with types (use 'Unknown' for properties not found in APOC)
    const propertiesWithTypes = properties.map(prop => ({
      name: prop,
      type: typeMap[prop] || 'Unknown'
    }));
    
    return { 
      label, 
      properties: propertiesWithTypes,
      totalProperties: properties.length
    };
  }

  async getPropertiesForRelType(relType: string) {
    const safeType = this.neo4j.sanitizeIdentifier(relType);
    
    // Get distinct property keys
    const keyRecords = await this.neo4j.runQuery(
      `MATCH ()-[r:\`${safeType}\`]->() WITH r LIMIT 100
       UNWIND keys(r) AS key
       RETURN DISTINCT key ORDER BY key`,
    );
    const properties = keyRecords.map(r => r.get('key'));
    
    // Get property types using APOC (relationships)
    const typeRecords = await this.neo4j.runQuery(
      `CALL apoc.meta.data() YIELD label, property, type
       WHERE label = $relType
       RETURN property, type ORDER BY property`,
      { relType }
    );
    
    // Create a map of property -> type
    const typeMap: Record<string, string> = {};
    typeRecords.forEach(r => {
      typeMap[r.get('property')] = r.get('type');
    });
    
    // Combine keys with types
    const propertiesWithTypes = properties.map(prop => ({
      name: prop,
      type: typeMap[prop] || 'Unknown'
    }));
    
    return { 
      relationshipType: relType, 
      properties: propertiesWithTypes,
      totalProperties: properties.length
    };
  }

  async getFullSchema() {
    const [labels, relTypes, constraints] = await Promise.all([
      this.getLabels(),
      this.getRelationshipTypes(),
      this.getConstraints(),
    ]);
    const [labelDetails, relDetails] = await Promise.all([
      Promise.all(labels.map(l => this.getPropertiesForLabel(l))),
      Promise.all(relTypes.map(t => this.getPropertiesForRelType(t))),
    ]);
    return { nodeLabels: labelDetails, relationshipTypes: relDetails, constraints };
  }

  async getCounts() {
    const labels = await this.getLabels();
    return Promise.all(
      labels.map(async label => {
        const safeLabel = this.neo4j.sanitizeIdentifier(label);
        const records   = await this.neo4j.runQuery(
          `MATCH (n:\`${safeLabel}\`) RETURN count(n) AS count`,
        );
        return { label, count: records[0].get('count').toNumber() };
      }),
    );
  }

  async getTenants() {
    const records = await this.neo4j.runQuery(`
      MATCH ()-[r]->()
      WHERE r.tenant_id IS NOT NULL
      RETURN DISTINCT r.tenant_id AS tenant ORDER BY tenant`);
    return records.map(r => r.get('tenant'));
  }
}

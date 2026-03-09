/**
 * Schema Registration Service
 *
 * Automatically registers entity schemas in Neo4j when they're used.
 * Similar to PromotionSchemaService but for base entities and their subtypes.
 *
 * Model:
 *   (:EntitySchema { label, key })
 *      -[:HAS_PROPERTY]->
 *   (:SchemaProperty { name, type })
 */

import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { ENTITY_CONFIGS, getAllEntities } from '../shared/entity-config';
import { BUILTIN_SUBTYPES } from '../promotions/subtype-config';

export interface EntitySchemaDefinition {
  key: string;
  label: string;
  properties: Array<{ name: string; type: string }>;
}

export interface RelationshipSchemaDefinition {
  relationshipType: string;
  properties: Array<{ name: string; type: string }>;
}

@Injectable()
export class SchemaRegistrationService implements OnApplicationBootstrap {
  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Auto-register all base entity schemas and built-in subtypes on application bootstrap.
   */
  async onApplicationBootstrap() {
    console.log('📋 Initializing entity schemas...');
    try {
      await this.registerAllBaseEntities();
      await this.registerAllBuiltinSubtypes();
      console.log('✅ Entity schemas initialized');
    } catch (err) {
      console.error('❌ Failed to initialize entity schemas:', err);
      // Don't throw — allow the app to continue even if schemas fail to register
    }
  }

  /**
   * Register all base entities from entity-config.ts
   */
  async registerAllBaseEntities(): Promise<void> {
    const entities = getAllEntities();

    for (const entity of entities) {
      try {
        await this.upsertEntitySchema(this.convertEntityConfigToSchema(entity));
        console.log(`✓ Registered base entity: ${entity.label}`);
      } catch (err) {
        console.warn(`✗ Failed to register base entity ${entity.label}:`, err);
      }
    }
  }

  /**
   * Register all built-in promotion subtypes
   */
  async registerAllBuiltinSubtypes(): Promise<void> {
    for (const subtype of BUILTIN_SUBTYPES) {
      try {
        await this.upsertEntitySchema({
          key: subtype.key,
          label: subtype.label,
          properties: subtype.properties.map(name => ({ name, type: 'STRING' })),
        });
        console.log(`✓ Registered subtype entity: ${subtype.label}`);
      } catch (err) {
        console.warn(`✗ Failed to register subtype entity ${subtype.label}:`, err);
      }
    }
  }

  /**
   * Upsert an entity schema definition in Neo4j.
   * Handles existing relationships gracefully.
   */
  async upsertEntitySchema(entity: EntitySchemaDefinition): Promise<void> {
    try {
      // First, try to delete existing properties and relationships safely
      await this.neo4j.runQuery(
        `
        MATCH (e:EntitySchema { key: $key })
        OPTIONAL MATCH (e)-[r:HAS_PROPERTY]->(p:SchemaProperty)
        DELETE r, p
        `,
        { key: entity.key }
      ).catch(err => {
        // If deletion fails due to relationships, just log and continue
        console.warn(`⚠ Could not clean up existing schema for ${entity.key}:`, err.message);
      });

      // Create the entity schema node
      await this.neo4j.runQuery(
        `
        MERGE (e:EntitySchema { key: $key })
        SET e.label = $label
        `,
        { key: entity.key, label: entity.label }
      );

      // Create property nodes and relationships
      for (const prop of entity.properties) {
        await this.neo4j.runQuery(
          `
          MATCH (e:EntitySchema { key: $key })
          MERGE (p:SchemaProperty { name: $propName, type: $propType })
          MERGE (e)-[:HAS_PROPERTY]->(p)
          `,
          {
            key: entity.key,
            propName: prop.name,
            propType: this.normalizeType(prop.type),
          }
        );
      }
    } catch (err) {
      console.warn(`⚠ Failed to upsert entity schema for ${entity.key}:`, err.message);
      // Don't throw - allow the app to continue
    }
  }

  /**
   * Get all registered entity schemas
   */
  async getAllEntitySchemas(): Promise<EntitySchemaDefinition[]> {
    const records = await this.neo4j.runQuery(
      `
      MATCH (e:EntitySchema)
      OPTIONAL MATCH (e)-[:HAS_PROPERTY]->(p:SchemaProperty)
      RETURN e.key AS key, e.label AS label,
             collect(DISTINCT { name: p.name, type: toUpper(p.type) }) AS properties
      ORDER BY e.label
      `
    );

    return records.map(r => ({
      key: r.get('key'),
      label: r.get('label'),
      properties: (r.get('properties') ?? []).filter(p => p.name), // Filter out nulls
    }));
  }

  /**
   * Get schema for a specific entity label
   */
  async getEntitySchema(label: string): Promise<EntitySchemaDefinition | null> {
    const records = await this.neo4j.runQuery(
      `
      MATCH (e:EntitySchema { label: $label })
      OPTIONAL MATCH (e)-[:HAS_PROPERTY]->(p:SchemaProperty)
      RETURN e.key AS key, e.label AS label,
             collect(DISTINCT { name: p.name, type: toUpper(p.type) }) AS properties
      `,
      { label }
    );

    if (!records.length) return null;

    const r = records[0];
    return {
      key: r.get('key'),
      label: r.get('label'),
      properties: (r.get('properties') ?? []).filter(p => p.name),
    };
  }

  /**
   * Ensure a base entity schema is registered (fallback if app startup failed)
   */
  async ensureEntitySchema(key: string): Promise<void> {
    try {
      const entity = getAllEntities().find(e => e.key === key);
      if (!entity) return;

      await this.upsertEntitySchema(this.convertEntityConfigToSchema(entity));
    } catch (err) {
      console.warn(`⚠ Failed to ensure entity "${key}" schema is registered:`, err);
    }
  }

  /**
   * Convert EntityConfig to EntitySchemaDefinition
   */
  private convertEntityConfigToSchema(entity: any): EntitySchemaDefinition {
    const typeMap = entity.propertyTypes ?? {};
    const properties: Array<{ name: string; type: string }> = [];

    // Include the ID field first if it is typed
    if (entity.idField) {
      const idType = this.normalizeType(typeMap[entity.idField] || 'STRING');
      properties.push({ name: entity.idField, type: idType });
    }

    // Then include configured properties in alphabetical order for stability
    const sortedKeys = Object.keys(entity.properties).sort();
    for (const key of sortedKeys) {
      const propType = this.normalizeType(typeMap[key] || 'STRING');
      properties.push({ name: key, type: propType });
    }

    return {
      key: entity.key,
      label: entity.label,
      properties,
    };
  }

  /**
   * Register a user-defined entity schema (for dynamic entities)
   */
  async registerUserDefinedEntity(
    key: string,
    label: string,
    properties: Array<{ name: string; type: string }>
  ): Promise<void> {
    const normalizedProperties = properties.map((p) => ({
      name: p.name,
      type: this.normalizeType(p.type),
    }));

    await this.upsertEntitySchema({ key, label, properties: normalizedProperties });
    console.log(`✓ Auto-registered user-defined entity "${label}" with ${properties.length} properties`);
  }

  private normalizeType(type: unknown): string {
    const raw = typeof type === 'string' ? type : String(type ?? '');
    const normalized = raw.trim().toUpperCase();
    return normalized || 'UNKNOWN';
  }
}
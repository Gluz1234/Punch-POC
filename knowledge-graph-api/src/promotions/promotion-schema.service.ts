import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../infrastructure/neo4j/neo4j.service';

export interface PromotionSubtypeDefinitionDto {
  key: string;
  label: string;
  baseLabel: string;
  properties: string[];
  icon: string;
}

export interface PromotionSubtypeDefinition {
  key: string;
  label: string;
  baseLabel: string;
  properties: string[];
  icon: string;
}

/**
 * Stores promotion subtype metadata in Neo4j so that subtype → property
 * ownership can be defined and extended at runtime, without code changes.
 *
 * Model:
 *   (:PromotionSubtype { key, label, base_label })
 *      -[:HAS_FIELD]->
 *   (:PromotionField { name })
 */
@Injectable()
export class PromotionSchemaService {
  constructor(private readonly neo4j: Neo4jService) {}

  async upsertSubtypeDefinition(dto: PromotionSubtypeDefinitionDto): Promise<PromotionSubtypeDefinition> {
    const properties = Array.from(new Set(dto.properties ?? [])).filter(Boolean);

    const records = await this.neo4j.runQuery(
      `
      MERGE (s:PromotionSubtype { key: $key })
      SET s.label = $label,
          s.base_label = $baseLabel,
          s.icon = $icon
      WITH s
      OPTIONAL MATCH (s)-[r:HAS_FIELD]->(f:PromotionField)
      DELETE r
      WITH s
      UNWIND $properties AS propName
      MERGE (f:PromotionField { name: propName })
      MERGE (s)-[:HAS_FIELD]->(f)
      RETURN s.key        AS key,
             s.label      AS label,
             s.base_label AS baseLabel,
             s.icon       AS icon,
             $properties  AS properties
      `,
      {
        key: dto.key,
        label: dto.label,
        baseLabel: dto.baseLabel,
        icon: dto.icon ?? '',
        properties,
      },
    );

    const row = records[0];
    return {
      key: row.get('key'),
      label: row.get('label'),
      baseLabel: row.get('baseLabel'),
      icon: row.get('icon') ?? '',
      properties: row.get('properties'),
    };
  }

  async getSubtypeDefinitionsForBase(baseLabel: string): Promise<PromotionSubtypeDefinition[]> {
    const records = await this.neo4j.runQuery(
      `
      MATCH (s:PromotionSubtype { base_label: $baseLabel })
      OPTIONAL MATCH (s)-[:HAS_FIELD]->(f:PromotionField)
      RETURN s.key        AS key,
             s.label      AS label,
             s.base_label AS baseLabel,
             s.icon       AS icon,
             collect(DISTINCT f.name) AS properties
      ORDER BY label
      `,
      { baseLabel },
    );

    return records.map((r) => ({
      key: r.get('key'),
      label: r.get('label'),
      baseLabel: r.get('baseLabel'),
      icon: r.get('icon') ?? '',
      properties: (r.get('properties') ?? []) as string[],
    }));
  }

  async getAllSubtypeDefinitions(): Promise<PromotionSubtypeDefinition[]> {
    const records = await this.neo4j.runQuery(
      `
      MATCH (s:PromotionSubtype)
      OPTIONAL MATCH (s)-[:HAS_FIELD]->(f:PromotionField)
      RETURN s.key        AS key,
             s.label      AS label,
             s.base_label AS baseLabel,
             s.icon       AS icon,
             collect(DISTINCT f.name) AS properties
      ORDER BY baseLabel, label
      `,
    );

    return records.map((r) => ({
      key: r.get('key'),
      label: r.get('label'),
      baseLabel: r.get('baseLabel'),
      icon: r.get('icon') ?? '',
      properties: (r.get('properties') ?? []) as string[],
    }));
  }

  async getSubtypeDefinition(key: string): Promise<PromotionSubtypeDefinition | null> {
    const records = await this.neo4j.runQuery(
      `
      MATCH (s:PromotionSubtype { key: $key })
      OPTIONAL MATCH (s)-[:HAS_FIELD]->(f:PromotionField)
      RETURN s.key        AS key,
             s.label      AS label,
             s.base_label AS baseLabel,
             s.icon       AS icon,
             collect(DISTINCT f.name) AS properties
      `,
      { key },
    );
    if (!records.length) return null;
    const r = records[0];
    return {
      key: r.get('key'),
      label: r.get('label'),
      baseLabel: r.get('baseLabel'),
      icon: r.get('icon') ?? '',
      properties: (r.get('properties') ?? []) as string[],
    };
  }

  /**
   * Get existing properties for a subtype without deleting them.
   * Used when merging additional properties.
   */
  async getPropertiesForSubtype(key: string): Promise<string[]> {
    const records = await this.neo4j.runQuery(
      `
      MATCH (s:PromotionSubtype { key: $key })
      OPTIONAL MATCH (s)-[:HAS_FIELD]->(f:PromotionField)
      RETURN collect(DISTINCT f.name) AS properties
      `,
      { key },
    );

    if (!records.length) return [];
    return (records[0].get('properties') ?? []) as string[];
  }

  /**
   * Upsert subtype definition while MERGING new properties with existing ones.
   * Unlike upsertSubtypeDefinition, this does not delete existing properties.
   * Used when registering user-defined subtypes that may accumulate properties over time.
   */
  async upsertSubtypeDefinitionMerging(
    dto: PromotionSubtypeDefinitionDto,
  ): Promise<PromotionSubtypeDefinition> {
    // Get existing properties
    const existing = await this.getPropertiesForSubtype(dto.key);

    // Merge: keep all unique property names
    const merged = Array.from(
      new Set([...existing, ...(dto.properties ?? [])]),
    ).filter(Boolean);

    // Use the standard upsert (which replaces all properties)
    // But we pass the merged set instead
    return this.upsertSubtypeDefinition({
      ...dto,
      properties: merged,
    });
  }

  /**
   * Register multiple subtype definitions at once.
   * Typically called on app startup to register built-in subtypes.
   */
  async registerMultipleSubtypes(
    subtypes: PromotionSubtypeDefinitionDto[],
  ): Promise<PromotionSubtypeDefinition[]> {
    const results: PromotionSubtypeDefinition[] = [];

    for (const subtype of subtypes) {
      try {
        const result = await this.upsertSubtypeDefinition(subtype);
        results.push(result);
        console.log(`✓ Registered subtype: ${subtype.label}`);
      } catch (err) {
        console.warn(`✗ Failed to register subtype ${subtype.label}:`, err);
      }
    }

    return results;
  }
}


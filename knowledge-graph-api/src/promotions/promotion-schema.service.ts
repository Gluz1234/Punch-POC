import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../infrastructure/neo4j/neo4j.service';

export interface PromotionSubtypeDefinitionDto {
  key: string;
  label: string;
  baseLabel: string;
  properties: string[];
  icon: string;
  /** Base type labels this subtype is allowed to be applied to. Universal per subtype. */
  allowedBaseLabels?: string[];
}

export interface PromotionSubtypeDefinition {
  key: string;
  label: string;
  baseLabel: string;
  properties: string[];
  icon: string;
  /** Base type labels this subtype is allowed to be applied to. Universal per subtype. */
  allowedBaseLabels: string[];
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
    // Default allowedBaseLabels to [baseLabel] if not provided
    const allowedBaseLabels = Array.from(
      new Set((dto.allowedBaseLabels?.length ? dto.allowedBaseLabels : [dto.baseLabel]).filter(Boolean)),
    );

    const records = await this.neo4j.runQuery(
      `
      MERGE (s:PromotionSubtype { key: $key })
      SET s.label = $label,
          s.base_label = $baseLabel,
          s.icon = $icon,
          s.allowed_base_labels = $allowedBaseLabels
      WITH s
      OPTIONAL MATCH (s)-[r:HAS_FIELD]->(f:PromotionField)
      DELETE r
      WITH s
      UNWIND $properties AS propName
      MERGE (f:PromotionField { name: propName })
      MERGE (s)-[:HAS_FIELD]->(f)
      RETURN s.key                  AS key,
             s.label                AS label,
             s.base_label           AS baseLabel,
             s.icon                 AS icon,
             s.allowed_base_labels  AS allowedBaseLabels,
             $properties            AS properties
      `,
      {
        key: dto.key,
        label: dto.label,
        baseLabel: dto.baseLabel,
        icon: dto.icon ?? '',
        allowedBaseLabels,
        properties,
      },
    );

    const row = records[0];
    return {
      key: row.get('key'),
      label: row.get('label'),
      baseLabel: row.get('baseLabel'),
      icon: row.get('icon') ?? '',
      allowedBaseLabels: (row.get('allowedBaseLabels') ?? []) as string[],
      properties: row.get('properties'),
    };
  }

  async getSubtypeDefinitionsForBase(baseLabel: string): Promise<PromotionSubtypeDefinition[]> {
    const records = await this.neo4j.runQuery(
      `
      MATCH (s:PromotionSubtype { base_label: $baseLabel })
      OPTIONAL MATCH (s)-[:HAS_FIELD]->(f:PromotionField)
      RETURN s.key                  AS key,
             s.label                AS label,
             s.base_label           AS baseLabel,
             s.icon                 AS icon,
             s.allowed_base_labels  AS allowedBaseLabels,
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
      allowedBaseLabels: (r.get('allowedBaseLabels') ?? [r.get('baseLabel')]) as string[],
      properties: (r.get('properties') ?? []) as string[],
    }));
  }

  async getAllSubtypeDefinitions(): Promise<PromotionSubtypeDefinition[]> {
    const records = await this.neo4j.runQuery(
      `
      MATCH (s:PromotionSubtype)
      OPTIONAL MATCH (s)-[:HAS_FIELD]->(f:PromotionField)
      RETURN s.key                  AS key,
             s.label                AS label,
             s.base_label           AS baseLabel,
             s.icon                 AS icon,
             s.allowed_base_labels  AS allowedBaseLabels,
             collect(DISTINCT f.name) AS properties
      ORDER BY baseLabel, label
      `,
    );

    return records.map((r) => ({
      key: r.get('key'),
      label: r.get('label'),
      baseLabel: r.get('baseLabel'),
      icon: r.get('icon') ?? '',
      allowedBaseLabels: (r.get('allowedBaseLabels') ?? [r.get('baseLabel')]) as string[],
      properties: (r.get('properties') ?? []) as string[],
    }));
  }

  async getSubtypeDefinition(key: string): Promise<PromotionSubtypeDefinition | null> {
    const records = await this.neo4j.runQuery(
      `
      MATCH (s:PromotionSubtype { key: $key })
      OPTIONAL MATCH (s)-[:HAS_FIELD]->(f:PromotionField)
      RETURN s.key                  AS key,
             s.label                AS label,
             s.base_label           AS baseLabel,
             s.icon                 AS icon,
             s.allowed_base_labels  AS allowedBaseLabels,
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
      allowedBaseLabels: (r.get('allowedBaseLabels') ?? [r.get('baseLabel')]) as string[],
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
   * Also preserves existing allowedBaseLabels when none are supplied in the dto.
   */
  async upsertSubtypeDefinitionMerging(
    dto: PromotionSubtypeDefinitionDto,
  ): Promise<PromotionSubtypeDefinition> {
    // Get existing definition so we can preserve both properties and allowedBaseLabels
    const existing = await this.getSubtypeDefinition(dto.key);
    const mergedBaseLabel = existing?.baseLabel ?? dto.baseLabel;

    // Merge properties: keep all unique names
    const mergedProperties = Array.from(
      new Set([...(existing?.properties ?? []), ...(dto.properties ?? [])]),
    ).filter(Boolean);

    // Preserve existing allowedBaseLabels if caller did not supply them
    const mergedAllowedBaseLabels =
      dto.allowedBaseLabels?.length
        ? dto.allowedBaseLabels
        : (existing?.allowedBaseLabels?.length ? existing.allowedBaseLabels : undefined);

    // Use the standard upsert (which replaces all properties)
    // But we pass the merged sets instead
    return this.upsertSubtypeDefinition({
      ...dto,
      baseLabel: mergedBaseLabel,
      properties: mergedProperties,
      ...(mergedAllowedBaseLabels ? { allowedBaseLabels: mergedAllowedBaseLabels } : {}),
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


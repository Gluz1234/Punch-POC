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
  /** Explicit type per property name (STRING / INTEGER / FLOAT / BOOLEAN / DATE). Defaults to STRING. */
  propertyTypes?: Record<string, string>;
}

export interface PromotionSubtypeDefinition {
  key: string;
  label: string;
  baseLabel: string;
  properties: string[];
  icon: string;
  /** Base type labels this subtype is allowed to be applied to. Universal per subtype. */
  allowedBaseLabels: string[];
  /** Type for each property. STRING by default. */
  propertyTypes: Record<string, string>;
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
    const propertyTypes = dto.propertyTypes ?? {};
    // Build [{name, type}] for Cypher FOREACH — handles empty lists safely
    const propertyDefs = properties.map((name) => ({
      name,
      type: this.normalizePropertyType(propertyTypes[name]),
    }));
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
      FOREACH (propDef IN $propertyDefs |
        MERGE (f:PromotionField { name: propDef.name })
        SET f.type = propDef.type
        MERGE (s)-[:HAS_FIELD]->(f)
      )
      WITH s
      OPTIONAL MATCH (s)-[:HAS_FIELD]->(f:PromotionField)
      RETURN s.key                  AS key,
             s.label                AS label,
             s.base_label           AS baseLabel,
             s.icon                 AS icon,
             s.allowed_base_labels  AS allowedBaseLabels,
             collect(DISTINCT { name: f.name, type: coalesce(f.type, 'STRING') }) AS fields
      `,
      {
        key: dto.key,
        label: dto.label,
        baseLabel: dto.baseLabel,
        icon: dto.icon ?? '',
        allowedBaseLabels,
        propertyDefs,
      },
    );

    const row = records[0];
    const parsed = this.parseFields(row.get('fields'));
    return {
      key: row.get('key'),
      label: row.get('label'),
      baseLabel: row.get('baseLabel'),
      icon: row.get('icon') ?? '',
      allowedBaseLabels: (row.get('allowedBaseLabels') ?? []) as string[],
      properties: parsed.properties,
      propertyTypes: parsed.propertyTypes,
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
             collect(DISTINCT { name: f.name, type: coalesce(f.type, 'STRING') }) AS fields
      ORDER BY label
      `,
      { baseLabel },
    );

    return records.map((r) => {
      const parsed = this.parseFields(r.get('fields'));
      return {
        key: r.get('key'),
        label: r.get('label'),
        baseLabel: r.get('baseLabel'),
        icon: r.get('icon') ?? '',
        allowedBaseLabels: (r.get('allowedBaseLabels') ?? [r.get('baseLabel')]) as string[],
        properties: parsed.properties,
        propertyTypes: parsed.propertyTypes,
      };
    });
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
             collect(DISTINCT { name: f.name, type: coalesce(f.type, 'STRING') }) AS fields
      ORDER BY baseLabel, label
      `,
    );

    return records.map((r) => {
      const parsed = this.parseFields(r.get('fields'));
      return {
        key: r.get('key'),
        label: r.get('label'),
        baseLabel: r.get('baseLabel'),
        icon: r.get('icon') ?? '',
        allowedBaseLabels: (r.get('allowedBaseLabels') ?? [r.get('baseLabel')]) as string[],
        properties: parsed.properties,
        propertyTypes: parsed.propertyTypes,
      };
    });
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
             collect(DISTINCT { name: f.name, type: coalesce(f.type, 'STRING') }) AS fields
      `,
      { key },
    );
    if (!records.length) return null;
    const r = records[0];
    const parsed = this.parseFields(r.get('fields'));
    return {
      key: r.get('key'),
      label: r.get('label'),
      baseLabel: r.get('baseLabel'),
      icon: r.get('icon') ?? '',
      allowedBaseLabels: (r.get('allowedBaseLabels') ?? [r.get('baseLabel')]) as string[],
      properties: parsed.properties,
      propertyTypes: parsed.propertyTypes,
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
   * Also preserves existing allowedBaseLabels and propertyTypes when not supplied.
   */
  async upsertSubtypeDefinitionMerging(
    dto: PromotionSubtypeDefinitionDto,
  ): Promise<PromotionSubtypeDefinition> {
    // Get existing definition so we can preserve properties, types, and allowedBaseLabels
    const existing = await this.getSubtypeDefinition(dto.key);
    const mergedBaseLabel = existing?.baseLabel ?? dto.baseLabel;

    // Merge properties: keep all unique names
    const mergedProperties = Array.from(
      new Set([...(existing?.properties ?? []), ...(dto.properties ?? [])]),
    ).filter(Boolean);

    // Merge propertyTypes: existing types are baseline, dto types override/add
    const mergedPropertyTypes: Record<string, string> = {
      ...(existing?.propertyTypes ?? {}),
      ...(dto.propertyTypes ?? {}),
    };

    // Preserve existing allowedBaseLabels if caller did not supply them
    const mergedAllowedBaseLabels =
      dto.allowedBaseLabels?.length
        ? dto.allowedBaseLabels
        : (existing?.allowedBaseLabels?.length ? existing.allowedBaseLabels : undefined);

    return this.upsertSubtypeDefinition({
      ...dto,
      baseLabel: mergedBaseLabel,
      properties: mergedProperties,
      propertyTypes: mergedPropertyTypes,
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

  // ── Private helpers ───────────────────────────────────────────────────────

  /** Normalise a user-supplied type string to one of the known scalar types. */
  private normalizePropertyType(type: string | undefined | null): string {
    const raw = (type ?? 'STRING').trim().toUpperCase();
    const valid = new Set(['STRING', 'INTEGER', 'FLOAT', 'BOOLEAN', 'DATE', 'DATETIME']);
    return valid.has(raw) ? raw : 'STRING';
  }

  /**
   * Convert the `fields` array returned by Cypher
   * (`collect(DISTINCT {name, type})`) into the two separate shape fields
   * used by PromotionSubtypeDefinition.
   */
  private parseFields(
    fields: Array<{ name: string; type: string } | null> | null,
  ): { properties: string[]; propertyTypes: Record<string, string> } {
    const filtered = (fields ?? []).filter(
      (f): f is { name: string; type: string } => !!f?.name,
    );
    return {
      properties: filtered.map((f) => f.name),
      propertyTypes: Object.fromEntries(
        filtered.map((f) => [f.name, this.normalizePropertyType(f.type)]),
      ),
    };
  }
}


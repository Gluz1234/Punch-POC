import { BadRequestException, Injectable } from '@nestjs/common';
import { Neo4jService } from '../infrastructure/neo4j/neo4j.service';
import { getAllEntities } from '../config/entity-config';
import { SchemaRegistrationService } from './schema-registration.service';
import { PromotionSchemaService } from '../promotions/promotion-schema.service';

const INTERNAL_SCHEMA_LABELS = new Set([
  'Entity',
  'EntitySchema',
  'SchemaProperty',
  'PromotionSubtype',
  'PromotionField',
]);

@Injectable()
export class SchemaService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly schemaRegistration: SchemaRegistrationService,
    private readonly promotionSchema: PromotionSchemaService,
  ) {}

  async getLabels(includeInternal = true): Promise<string[]> {
    const records = await this.neo4j.runQuery(
      'CALL db.labels() YIELD label RETURN label ORDER BY label',
    );
    const labels = records.map(r => r.get('label'));

    if (includeInternal) {
      return labels;
    }

    return labels.filter(label => !this.isInternalSchemaLabel(label));
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
    // First try to get from registered entity schemas
    const registeredSchema = await this.schemaRegistration.getEntitySchema(label);
    if (registeredSchema) {
      const normalizedProperties = this.normalizeProperties(registeredSchema.properties);

      // EntitySchema also stores subtype labels. Enrich those with promotion metadata
      // so /schema responses consistently expose baseLabel + allowedBaseLabels.
      try {
        const allDefs = await this.promotionSchema.getAllSubtypeDefinitions();
        const subtypeDef = allDefs.find(
          (st) => st.label.toLowerCase() === label.toLowerCase(),
        );

        if (subtypeDef) {
          return {
            label,
            icon: subtypeDef.icon ?? registeredSchema.icon ?? '',
            baseLabel: subtypeDef.baseLabel,
            allowedBaseLabels: subtypeDef.allowedBaseLabels ?? [subtypeDef.baseLabel],
            properties: normalizedProperties,
            totalProperties: normalizedProperties.length,
          };
        }
      } catch (err) {
        console.warn(`⚠ Failed to enrich subtype schema for ${label}:`, err);
      }

      return {
        label,
        icon: registeredSchema.icon ?? '',
        properties: normalizedProperties,
        totalProperties: normalizedProperties.length,
      };
    }

    // If this label corresponds to a configured entity, return the
    // *logical* schema from configuration instead of raw Neo4j keys.
    const entityConfig = getAllEntities().find(e => e.label === label);
    if (entityConfig) {
      const typeMap = entityConfig.propertyTypes ?? {};

      const props: { name: string; type: string }[] = [];

      // Include the ID field first if it is typed
      if (entityConfig.idField) {
        const idType = this.normalizeType(typeMap[entityConfig.idField] || 'Unknown');
        props.push({ name: entityConfig.idField, type: idType });
      }

      // Then include configured properties in alphabetical order for stability
      const sortedKeys = Object.keys(entityConfig.properties).sort();
      for (const key of sortedKeys) {
        const propType = this.normalizeType(typeMap[key] || 'Unknown');
        props.push({ name: key, type: propType });
      }

      // Auto-register this entity schema for future use
      try {
        await this.schemaRegistration.upsertEntitySchema({
          key: entityConfig.key,
          label: entityConfig.label,
          icon: entityConfig.icon ?? '',
          properties: props,
        });
      } catch (err) {
        console.warn(`⚠ Failed to auto-register entity schema for ${label}:`, err);
      }

      return {
        label,
        icon: entityConfig.icon ?? '',
        properties: props,
        totalProperties: props.length,
      };
    }

    // Check if this is a promotion subtype for any base label
    try {
      const allDefs = await this.promotionSchema.getAllSubtypeDefinitions();
      const subtypeDef = allDefs.find(
        (st) => st.label.toLowerCase() === label.toLowerCase(),
      );
      if (subtypeDef) {
        // For subtypes, return only the subtype-specific properties
        const subtypeProps = subtypeDef.properties.map(prop => ({
          name: prop,
          type: 'STRING',
        }));

        return {
          label,
          icon: subtypeDef.icon ?? '',
          baseLabel: subtypeDef.baseLabel,
          allowedBaseLabels: subtypeDef.allowedBaseLabels ?? [subtypeDef.baseLabel],
          properties: subtypeProps,
          totalProperties: subtypeProps.length,
        };
      }
    } catch (err) {
      console.warn(`⚠ Failed to check promotion subtypes for ${label}:`, err);
    }

    // Fallback: derive from existing nodes in Neo4j
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
      typeMap[r.get('property')] = this.normalizeType(r.get('type'));
    });

    // Combine keys with types (use 'Unknown' for properties not found in APOC)
    const propertiesWithTypes = properties.map(prop => ({
      name: prop,
      type: typeMap[prop] || 'UNKNOWN',
    }));

    return {
      label,
      icon: '❓',
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
      typeMap[r.get('property')] = this.normalizeType(r.get('type'));
    });
    
    // Combine keys with types
    const propertiesWithTypes = properties.map(prop => ({
      name: prop,
      type: typeMap[prop] || 'UNKNOWN',
    }));
    
    return { 
      relationshipType: relType, 
      properties: propertiesWithTypes,
      totalProperties: properties.length
    };
  }

  async getFullSchema(includeInternal = false) {
    // Ensure all schemas are registered
    await this.schemaRegistration.registerAllBaseEntities();
    await this.schemaRegistration.registerAllBuiltinSubtypes();

    const [labels, relTypes, constraints] = await Promise.all([
      this.getLabels(includeInternal),
      this.getRelationshipTypes(),
      this.getConstraints(),
    ]);

    const [labelDetails, relDetails] = await Promise.all([
      Promise.all(labels.map(l => this.getPropertiesForLabel(l))),
      Promise.all(relTypes.map(t => this.getPropertiesForRelType(t))),
    ]);

    return { nodeLabels: labelDetails, relationshipTypes: relDetails, constraints };
  }

  async getSchemaForTenant(tenantId: string) {
    const normalizedTenantId = tenantId?.trim();
    if (!normalizedTenantId) {
      throw new BadRequestException('tenantId is required');
    }

    // Ensure configured schema metadata is present before projection.
    await this.schemaRegistration.registerAllBaseEntities();
    await this.schemaRegistration.registerAllBuiltinSubtypes();

    const [labelRecords, relTypeRecords] = await Promise.all([
      this.neo4j.runQuery(
        `
        MATCH (a)-[r {tenant_id: $tenantId}]->(b)
        WITH collect(DISTINCT a) + collect(DISTINCT b) AS nodes
        UNWIND nodes AS n
        UNWIND labels(n) AS label
        RETURN DISTINCT label
        ORDER BY label
        `,
        { tenantId: normalizedTenantId },
      ),
      this.neo4j.runQuery(
        `
        MATCH ()-[r {tenant_id: $tenantId}]->()
        RETURN DISTINCT type(r) AS relationshipType
        ORDER BY relationshipType
        `,
        { tenantId: normalizedTenantId },
      ),
    ]);

    const labels = Array.from(
      new Set(
        labelRecords
          .map((record) => String(record.get('label')))
          .filter((label) => !this.isInternalSchemaLabel(label)),
      ),
    );

    const relationshipTypes = Array.from(
      new Set(relTypeRecords.map((record) => String(record.get('relationshipType')))),
    );

    const [nodeLabelDetails, relationshipTypeDetails] = await Promise.all([
      Promise.all(labels.map((label) => this.getPropertiesForLabel(label))),
      Promise.all(relationshipTypes.map((type) => this.getPropertiesForRelType(type))),
    ]);

    return {
      tenantId: normalizedTenantId,
      nodeLabels: nodeLabelDetails,
      relationshipTypes: relationshipTypeDetails,
      statistics: {
        totalNodeLabels: nodeLabelDetails.length,
        totalRelationshipTypes: relationshipTypeDetails.length,
      },
    };
  }

  private isInternalSchemaLabel(label: string): boolean {
    return INTERNAL_SCHEMA_LABELS.has(label);
  }

  private normalizeType(type: unknown): string {
    const raw = typeof type === 'string' ? type : String(type ?? '');
    const normalized = raw.trim().toUpperCase();
    return normalized || 'UNKNOWN';
  }

  private normalizeProperties(
    properties: Array<{ name: string; type: string }>,
  ): Array<{ name: string; type: string }> {
    const deduped = new Map<string, { name: string; type: string }>();

    for (const property of properties ?? []) {
      if (!property?.name) continue;

      const normalized = {
        name: property.name,
        type: this.normalizeType(property.type),
      };

      const existing = deduped.get(normalized.name);
      if (!existing || (existing.type === 'UNKNOWN' && normalized.type !== 'UNKNOWN')) {
        deduped.set(normalized.name, normalized);
      }
    }

    return Array.from(deduped.values());
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

  async getAllBaseTypes() {
    const configured = getAllEntities();
    const subtypeDefs = await this.promotionSchema.getAllSubtypeDefinitions();

    // Collect custom base labels not in the configured entity list
    const configuredLabelSet = new Set(configured.map((e) => e.label.toLowerCase()));
    const customBaseLabels = Array.from(
      new Set(
        subtypeDefs
          .map((def) => def.baseLabel?.trim())
          .filter((label) => label && !configuredLabelSet.has(label.toLowerCase())),
      ),
    ) as string[];

    const subtypeLabelSet = new Set(subtypeDefs.map((def) => def.label?.toLowerCase()));
    const customBaseLabelSet = new Set(customBaseLabels.map((l) => l.toLowerCase()));

    // Include EntitySchema-registered labels (e.g. created via smart-create)
    const registeredSchemas = await this.schemaRegistration.getAllEntitySchemas();
    const dynamicLabels = registeredSchemas
      .map((s) => s.label)
      .filter(
        (label) =>
          !configuredLabelSet.has(label.toLowerCase()) &&
          !subtypeLabelSet.has(label.toLowerCase()) &&
          !customBaseLabelSet.has(label.toLowerCase()),
      );

    // Also include any labels that exist in the graph but were never registered
    // (e.g. created via /dynamic/nodes which skips schema registration)
    const seenLabels = new Set([
      ...configuredLabelSet,
      ...subtypeLabelSet,
      ...customBaseLabelSet,
      ...dynamicLabels.map((l) => l.toLowerCase()),
    ]);
    const allGraphLabels = await this.getLabels(false); // excludes internal schema labels
    const unregisteredLabels = allGraphLabels.filter(
      (label) => !seenLabels.has(label.toLowerCase()) && !INTERNAL_SCHEMA_LABELS.has(label),
    );

    const allBaseLabels = [
      ...configured.map((e) => e.label),
      ...customBaseLabels.sort((a, b) => a.localeCompare(b)),
      ...dynamicLabels.sort((a, b) => a.localeCompare(b)),
      ...unregisteredLabels.sort((a, b) => a.localeCompare(b)),
    ];

    const nodeLabels = await Promise.all(
      allBaseLabels.map((label) => this.getPropertiesForLabel(label)),
    );

    return {
      nodeLabels,
      totalBaseTypes: nodeLabels.length,
    };
  }

  async getAllSubtypes() {
    const subtypeDefs = await this.promotionSchema.getAllSubtypeDefinitions();

    // Build the node-label shapes directly from the defs so allowedBaseLabels
    // and baseLabel are always present without a second Neo4j round-trip.
    const nodeLabels = subtypeDefs.map((def) => ({
      label: def.label,
      icon: def.icon ?? '',
      baseLabel: def.baseLabel,
      allowedBaseLabels: def.allowedBaseLabels ?? [def.baseLabel],
      properties: def.properties.map((prop) => ({ name: prop, type: 'STRING' })),
      totalProperties: def.properties.length,
    }));

    return {
      nodeLabels,
      totalSubtypes: nodeLabels.length,
    };
  }
}

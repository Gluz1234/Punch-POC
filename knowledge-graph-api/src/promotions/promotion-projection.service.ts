import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Neo4jService } from '../infrastructure/neo4j/neo4j.service';
import { ENTITY_CONFIGS, EntityConfig, getAllEntities } from '../config/entity-config';
import { PromotionSchemaService } from './promotion-schema.service';
import { SchemaRegistrationService } from '../schema/schema-registration.service';

export interface TypedPropertiesResponse {
  entityType: string;
  icon?: string;
  entityId: string;
  labels: string[];
  base: {
    label: string;
    properties: Record<string, any>;
  };
  subtypes: {
    label: string;
    icon?: string;
    baseLabel: string;
    allowedBaseLabels: string[];
    properties: Record<string, any>;
  }[];
  unknownProperties: Record<string, any>;
}

@Injectable()
export class PromotionProjectionService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly schema: PromotionSchemaService,
    private readonly schemaRegistration: SchemaRegistrationService,
  ) {}

  async getEntityTypedProperties(entityType: string, entityId: string): Promise<TypedPropertiesResponse> {
    const requested = this.resolveEntityConfig(entityType);
    const response = await this.getEntityTypedPropertiesById(entityId);
    if (response.entityType.toLowerCase() !== requested.label.toLowerCase()) {
      throw new BadRequestException(
        `entityType mismatch for ${entityId}: expected ${requested.label}, found ${response.entityType}`,
      );
    }
    return response;
  }

  async getEntityTypedPropertiesById(entityId: string): Promise<TypedPropertiesResponse> {
    const safeIdField = this.neo4j.sanitizeIdentifier('entity_id');
    const records = await this.neo4j.runQuery(
      `MATCH (n:Entity {\`${safeIdField}\`: $entityId})
       RETURN n, labels(n) AS labels`,
      { entityId },
    );

    if (!records.length) {
      throw new NotFoundException(`Entity ${entityId} not found`);
    }

    const node = records[0].get('n');
    const labels: string[] = records[0].get('labels');
    const props = this.neo4j.toPlainObject(node.properties);
    return this.projectTypedNode(props, labels, entityId);
  }

  async projectTypedNode(
    properties: Record<string, any>,
    labels: string[],
    explicitEntityId?: string,
  ): Promise<TypedPropertiesResponse> {
    const normalizedLabels = this.normalizeLabels(labels);
    // Strip legacy per-node icon props (e.g. employee_icon, student_icon) — icons are now type-level only
    const rawProps = this.neo4j.toPlainObject(properties ?? {});
    const props = Object.fromEntries(Object.entries(rawProps).filter(([k]) => !k.endsWith('_icon')));
    const entityId = explicitEntityId ?? this.extractEntityId(props);
    const config = this.tryResolveEntityConfigFromLabels(normalizedLabels);

    if (!config) {
      const fallbackLabel = this.resolveFallbackLabel(normalizedLabels);

      // Look up icon and subtypes from Neo4j EntitySchema / PromotionSubtype
      // so dynamic types created via smart-create also carry the right icon.
      const [entitySchema, dynamicSubtypeDefs] = await Promise.all([
        this.schemaRegistration.getEntitySchema(fallbackLabel),
        this.schema.getSubtypeDefinitionsForBase(fallbackLabel),
      ]);

      const dynamicIcon = entitySchema?.icon ?? undefined;

      // Bucket any properties that belong to dynamic subtypes present on this node
      const subtypeBuckets: Record<string, Record<string, any>> = {};
      const dynamicSubtypePropSets = new Map<string, Set<string>>();
      for (const def of dynamicSubtypeDefs) {
        dynamicSubtypePropSets.set(def.label, new Set<string>(def.properties));
      }

      const baseProps: Record<string, any> = {};
      const unknownProps: Record<string, any> = {};

      for (const [key, value] of Object.entries(props)) {
        let assigned = false;
        for (const label of normalizedLabels) {
          const propSet = dynamicSubtypePropSets.get(label);
          if (propSet && propSet.has(key)) {
            if (!subtypeBuckets[label]) subtypeBuckets[label] = {};
            subtypeBuckets[label][key] = value;
            assigned = true;
            break;
          }
        }
        if (!assigned) baseProps[key] = value;
      }

      return {
        entityType: fallbackLabel,
        icon: dynamicIcon,
        entityId,
        labels: normalizedLabels,
        base: {
          label: fallbackLabel,
          properties: baseProps,
        },
        subtypes: Object.entries(subtypeBuckets).map(([label, bucketProperties]) => {
          const subtypeDef = dynamicSubtypeDefs.find(d => d.label === label);
          const baseLabel = subtypeDef?.baseLabel ?? fallbackLabel;
          return {
            label,
            icon: subtypeDef?.icon ?? undefined,
            baseLabel,
            allowedBaseLabels: subtypeDef?.allowedBaseLabels ?? [baseLabel],
            properties: bucketProperties,
          };
        }),
        unknownProperties: unknownProps,
      };
    }

    const basePropKeys = new Set<string>([
      config.idField,
      ...Object.keys(config.properties),
    ]);

    const subtypePropSets = new Map<string, Set<string>>();
    const defs = await this.schema.getSubtypeDefinitionsForBase(config.label);
    defs.forEach((cfg) => {
      subtypePropSets.set(cfg.label, new Set<string>(cfg.properties));
    });

    const baseProperties: Record<string, any> = {};
    const subtypeBuckets: Record<string, Record<string, any>> = {};
    const unknownProperties: Record<string, any> = {};

    for (const [key, value] of Object.entries(props)) {
      if (basePropKeys.has(key)) {
        baseProperties[key] = value;
        continue;
      }

      let assignedToSubtype = false;
      for (const label of normalizedLabels) {
        const propSet = subtypePropSets.get(label);
        if (propSet && propSet.has(key)) {
          if (!subtypeBuckets[label]) subtypeBuckets[label] = {};
          subtypeBuckets[label][key] = value;
          assignedToSubtype = true;
          break;
        }
      }

      if (!assignedToSubtype) {
        unknownProperties[key] = value;
      }
    }

    return {
      entityType: config.label,
      icon: config.icon,
      entityId,
      labels: normalizedLabels,
      base: {
        label: config.label,
        properties: baseProperties,
      },
      subtypes: Object.entries(subtypeBuckets).map(([label, bucketProperties]) => {
        const subtypeDef = defs.find(d => d.label === label);
        const baseLabel = subtypeDef?.baseLabel ?? config.label;
        return {
          label,
          icon: subtypeDef?.icon ?? '❓',
          baseLabel,
          allowedBaseLabels: subtypeDef?.allowedBaseLabels ?? [baseLabel],
          properties: bucketProperties,
        };
      }),
      unknownProperties,
    };
  }

  async getPersonTypedProperties(strongId: string): Promise<TypedPropertiesResponse> {
    return this.getEntityTypedProperties('person', strongId);
  }

  private resolveEntityConfig(entityType: string): EntityConfig {
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

  private tryResolveEntityConfigFromLabels(labels: string[]): EntityConfig | null {
    const lower = new Set((labels ?? []).map(l => l.toLowerCase()));
    return getAllEntities().find(e => lower.has(e.label.toLowerCase())) ?? null;
  }

  private extractEntityId(properties: Record<string, any>): string {
    const raw = properties?.entity_id ?? properties?.id ?? '';
    return typeof raw === 'string' ? raw : String(raw ?? '');
  }

  private resolveFallbackLabel(labels: string[]): string {
    return labels?.[0] ?? 'Unknown';
  }

  private normalizeLabels(labels: string[]): string[] {
    const out: string[] = [];
    const seen = new Set<string>();

    for (const label of Array.isArray(labels) ? labels : []) {
      if (typeof label !== 'string') continue;
      if (label.toLowerCase() === 'entity') continue;
      if (seen.has(label)) continue;
      seen.add(label);
      out.push(label);
    }

    return out;
  }
}

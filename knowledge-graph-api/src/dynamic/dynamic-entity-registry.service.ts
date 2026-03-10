import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { ENTITY_CONFIGS, EntityConfig } from '../shared/entity-config';

// Snapshot of hardcoded keys at import time - these are never overwritten.
const HARDCODED_KEYS = new Set(Object.keys(ENTITY_CONFIGS));

@Injectable()
export class DynamicEntityRegistryService implements OnApplicationBootstrap {
  constructor(private readonly neo4j: Neo4jService) {}

  async onApplicationBootstrap(): Promise<void> {
    console.log('Loading dynamic entity registrations...');
    try {
      await this.loadAll();
      console.log('Dynamic entity registrations loaded');
    } catch (err) {
      console.error('Failed to load dynamic entity registrations:', err);
    }
  }

  async loadAll(): Promise<void> {
    const records = await this.neo4j.runQuery(`
      MATCH (d:DynamicEntityConfig)
      RETURN d.key AS key, d.label AS label, d.idField AS idField,
             d.properties AS propertiesJson, d.propertyTypes AS propertyTypesJson
    `);

    for (const r of records) {
      const key = r.get('key') as string;
      if (HARDCODED_KEYS.has(key)) continue;
      try {
        this.mergeIntoRegistry({
          key,
          label: r.get('label'),
          idField: r.get('idField') ?? 'entity_id',
          properties: JSON.parse(r.get('propertiesJson') ?? '{}'),
          propertyTypes: JSON.parse(r.get('propertyTypesJson') ?? '{}'),
        });
      } catch {
        console.warn(`Failed to load dynamic entity config: ${key}`);
      }
    }
  }

  async register(
    label: string,
    idField: string,
    properties: Record<string, string>,
    propertyTypes: Record<string, string>,
  ): Promise<void> {
    const key = label.toLowerCase();
    if (HARDCODED_KEYS.has(key)) return;

    await this.neo4j.runQuery(
      `
      MERGE (d:DynamicEntityConfig { key: $key })
      SET d.label         = $label,
          d.idField       = $idField,
          d.properties    = $propertiesJson,
          d.propertyTypes = $propertyTypesJson
    `,
      {
        key,
        label,
        idField,
        propertiesJson: JSON.stringify(properties),
        propertyTypesJson: JSON.stringify(propertyTypes),
      },
    );

    this.mergeIntoRegistry({ key, label, idField, properties, propertyTypes });
  }

  private mergeIntoRegistry(
    cfg: Pick<EntityConfig, 'key' | 'label' | 'idField' | 'properties' | 'propertyTypes'>,
  ): void {
    if (ENTITY_CONFIGS[cfg.key]) return;
    ENTITY_CONFIGS[cfg.key] = {
      key: cfg.key,
      label: cfg.label,
      idField: cfg.idField,
      displayName: cfg.label,
      route: `${cfg.label.toLowerCase()}s`,
      properties: cfg.properties ?? {},
      propertyTypes: cfg.propertyTypes ?? {},
    };
    console.log(`Registered dynamic entity: ${cfg.label}`);
  }
}

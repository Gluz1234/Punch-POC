import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import neo4j, { Integer } from 'neo4j-driver';
import { randomUUID } from 'crypto';
import { Neo4jService } from '../neo4j/neo4j.service';
import { EntityConfig, getAllEntities } from './entity-config';
import { SchemaRegistrationService } from '../schema/schema-registration.service';
import { PromotionProjectionService } from '../promotions/promotion-projection.service';

/**
 * Generic Entity Service
 * Replaces all hardcoded services (PersonsService, CoursesService, etc.)
 *
 * This is the single source of CRUD logic for all standard entities.
 * Add special cases as optional overrides, but most entities work out-of-the-box.
 */
@Injectable()
export class GenericEntityService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly schemaRegistration: SchemaRegistrationService,
    private readonly projection: PromotionProjectionService,
  ) {}

  /**
   * Create or update (upsert) an entity.
   * Uses Cypher MERGE on the ID field to guarantee uniqueness.
   */
  async upsert(config: EntityConfig, dto: any) {
    // Ensure entity schema is registered (fallback if app startup failed)
    await this.schemaRegistration.ensureEntitySchema(config.key);

    const idValue = this.resolveIncomingEntityId(config, dto) ?? randomUUID();
    const safeLabel = this.neo4j.sanitizeIdentifier(config.label);
    const safeIdField = this.neo4j.sanitizeIdentifier(config.idField);
    const safeProps = this.sanitizePropertyKeys(config, dto);

    // Build SET clauses for all properties
    const setParts = Object.keys(safeProps)
      .map(k => `n.\`${k}\` = $prop_${k}`)
      .join(', ');
    const onCreateSet = [`n.\`${safeIdField}\` = $nodeId`, setParts].filter(Boolean).join(', ');
    const onMatchSet = setParts ? `ON MATCH SET ${setParts}` : '';

    const params: Record<string, any> = { nodeId: String(idValue) };
    for (const [k, v] of Object.entries(safeProps)) {
      params[`prop_${k}`] = v;
    }

    const records = await this.neo4j.runQuery(`
      MERGE (n:\`${safeLabel}\`:Entity {\`${safeIdField}\`: $nodeId})
      ON CREATE SET ${onCreateSet}
      ${onMatchSet}
      RETURN n, labels(n) AS labels`,
      params,
    );

    return this.formatResult(records[0]);
  }

  /**
   * Find all entities of this type.
   */
  async findAll(config: EntityConfig, limit = 1000) {
    const safeLabel = this.neo4j.sanitizeIdentifier(config.label);
    const records = await this.neo4j.runQuery(
      `MATCH (n:\`${safeLabel}\`) RETURN n, labels(n) AS labels ORDER BY n.\`${config.idField}\` LIMIT $limit`,
      { limit: neo4j.int(limit) },
    );
    return Promise.all(records.map(r => this.formatResult(r)));
  }

  /**
   * Find a single entity by ID.
   */
  async findOne(config: EntityConfig, id: string) {
    const safeLabel = this.neo4j.sanitizeIdentifier(config.label);
    const safeIdField = this.neo4j.sanitizeIdentifier(config.idField);
    const records = await this.neo4j.runQuery(
      `MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $id}) RETURN n, labels(n) AS labels`,
      { id },
    );

    if (!records.length) {
      throw new NotFoundException(
        `${config.displayName} with ${config.idField}=${id} not found`,
      );
    }

    return this.formatResult(records[0]);
  }

  /**
   * Find entities by a specific property (for filtered queries like "by-org").
   */
  async findBy(
    config: EntityConfig,
    filterField: string,
    filterValue: string,
    limit = 1000,
  ) {
    const safeLabel = this.neo4j.sanitizeIdentifier(config.label);
    const safeField = this.neo4j.sanitizeIdentifier(filterField);
    const records = await this.neo4j.runQuery(
      `MATCH (n:\`${safeLabel}\` {\`${safeField}\`: $value}) RETURN n, labels(n) AS labels ORDER BY n.\`${config.idField}\` LIMIT $limit`,
      { value: filterValue, limit },
    );

    return Promise.all(records.map(r => this.formatResult(r)));
  }

  /**
   * Update an entity's properties.
   */
  async update(config: EntityConfig, id: string, dto: any) {
    // Ensure entity schema is registered (fallback if app startup failed)
    await this.schemaRegistration.ensureEntitySchema(config.key);

    const safeLabel = this.neo4j.sanitizeIdentifier(config.label);
    const safeIdField = this.neo4j.sanitizeIdentifier(config.idField);
    const safeProps = this.sanitizePropertyKeys(config, dto);

    if (!Object.keys(safeProps).length) {
      throw new BadRequestException('No properties provided to update');
    }

    const setParts = Object.keys(safeProps)
      .map(k => `n.\`${k}\` = $prop_${k}`)
      .join(', ');

    const params: Record<string, any> = { id };
    for (const [k, v] of Object.entries(safeProps)) {
      params[`prop_${k}`] = v;
    }

    const records = await this.neo4j.runQuery(
      `MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $id})
       SET ${setParts}
       RETURN n, labels(n) AS labels`,
      params,
    );

    if (!records.length) {
      throw new NotFoundException(
        `${config.displayName} with ${config.idField}=${id} not found`,
      );
    }

    return this.formatResult(records[0]);
  }

  /**
   * Delete an entity.
   */
  async remove(config: EntityConfig, id: string) {
    const safeLabel = this.neo4j.sanitizeIdentifier(config.label);
    const safeIdField = this.neo4j.sanitizeIdentifier(config.idField);
    const records = await this.neo4j.runQuery(
      `MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $id})
       DETACH DELETE n RETURN count(n) AS deleted`,
      { id },
    );

    if (!records[0].get('deleted').toNumber()) {
      throw new NotFoundException(
        `${config.displayName} with ${config.idField}=${id} not found`,
      );
    }

    return { deleted: true, id, label: config.label };
  }

  /**
   * Filter out the ID field and sensitive fields from properties.
   */
  private sanitizePropertyKeys(config: EntityConfig, dto: any): Record<string, any> {
    // Build skip-list dynamically from all entity ID fields + their camelCase variants
    const skipFields = new Set<string>();
    for (const entity of getAllEntities()) {
      skipFields.add(entity.idField);
      // Also skip camelCase body keys that map to ID fields (e.g., personStrongId → strong_id)
      const camelKey = entity.idField.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      skipFields.add(camelKey);
      for (const legacyField of entity.legacyIdFields ?? []) {
        skipFields.add(legacyField);
      }
    }

    skipFields.add('id');

    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(dto || {})) {
      if (!skipFields.has(k) && v !== undefined && v !== null) {
        const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = v;
      }
    }
    return result;
  }

  private resolveIncomingEntityId(config: EntityConfig, dto: any): string | null {
    const candidates = [
      dto?.[config.idField],
      ...((config.legacyIdFields ?? []).map(k => dto?.[k])),
      dto?.id,
    ];

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }

  /**
   * Format a Neo4j record into a clean response object.
   */
  private async formatResult(record: any) {
    const properties = this.neo4j.toPlainObject(record.get('n').properties);
    const labels = record.get('labels') as string[];
    return this.projection.projectTypedNode(properties, labels);
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import neo4j, { Integer } from 'neo4j-driver';
import { randomUUID } from 'crypto';
import { Neo4jService } from '../infrastructure/neo4j/neo4j.service';
import { EntityConfig, getAllEntities } from '../config/entity-config';
import { SchemaRegistrationService } from '../schema/schema-registration.service';
import { PromotionProjectionService } from '../promotions/promotion-projection.service';
import { EntityResolutionService } from './entity-resolution.service';

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
    private readonly resolution: EntityResolutionService,
  ) {}

  /**
   * Create or update (upsert) an entity.
   * Uses Cypher MERGE on the ID field to guarantee uniqueness.
   */
  async upsert(config: EntityConfig, dto: any) {
    // Ensure entity schema is registered (fallback if app startup failed)
    await this.schemaRegistration.ensureEntitySchema(config.key);

    const incomingId = this.resolveIncomingEntityId(config, dto);
    const idValue = incomingId
      ? await this.resolution.resolveCanonicalEntityIdIfExists(incomingId)
      : randomUUID();

    await this.ensureEntityBelongsToConfigIfExists(config, String(idValue));

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

    const entity = await this.formatResult(records[0]);
    const requestedId = incomingId ?? String(idValue);
    const identity = await this.resolution.buildMutationContextForEntity(requestedId, true);

    return {
      ...entity,
      _identity: identity,
    };
  }

  /**
   * Find all entities of this type.
   */
  async findAll(config: EntityConfig, limit = 1000, tenantId?: string) {
    const safeLabel = this.neo4j.sanitizeIdentifier(config.label);

    let records: any[];
    if (tenantId) {
      records = await this.neo4j.runQuery(
        `MATCH (n:\`${safeLabel}\`)
         WITH n ORDER BY n.\`${config.idField}\` LIMIT $limit
         WITH n, labels(n) AS labels
         OPTIONAL MATCH (n)-[:HAS_SUBTYPE_INSTANCE { tenant_id: $tenantId }]->(si:SubtypeInstance)
         RETURN n, labels, collect(DISTINCT { labels: labels(si), props: properties(si) }) AS subtypeInstances`,
        { limit: neo4j.int(limit), tenantId },
      );
    } else {
      records = await this.neo4j.runQuery(
        `MATCH (n:\`${safeLabel}\`) RETURN n, labels(n) AS labels ORDER BY n.\`${config.idField}\` LIMIT $limit`,
        { limit: neo4j.int(limit) },
      );
    }

    return Promise.all(records.map(r => this.formatResult(r, tenantId)));
  }

  /**
   * Find a single entity by ID.
   */
  async findOne(config: EntityConfig, id: string, tenantId?: string) {
    const safeLabel = this.neo4j.sanitizeIdentifier(config.label);
    const safeIdField = this.neo4j.sanitizeIdentifier(config.idField);
    const records = await this.neo4j.runQuery(
      tenantId
        ? `MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $id})
           WITH n, labels(n) AS labels
           OPTIONAL MATCH (n)-[:HAS_SUBTYPE_INSTANCE { tenant_id: $tenantId }]->(si:SubtypeInstance)
           RETURN n, labels, collect(DISTINCT { labels: labels(si), props: properties(si) }) AS subtypeInstances`
        : `MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $id}) RETURN n, labels(n) AS labels`,
      tenantId ? { id, tenantId } : { id },
    );

    if (!records.length) {
      throw new NotFoundException(
        `${config.displayName} with ${config.idField}=${id} not found`,
      );
    }

    return this.formatResult(records[0], tenantId);
  }

  /**
   * Find entities by a specific property (for filtered queries like "by-org").
   */
  async findBy(
    config: EntityConfig,
    filterField: string,
    filterValue: string,
    limit = 1000,
    tenantId?: string,
  ) {
    const safeLabel = this.neo4j.sanitizeIdentifier(config.label);
    const safeField = this.neo4j.sanitizeIdentifier(filterField);
    const records = await this.neo4j.runQuery(
      tenantId
        ? `MATCH (n:\`${safeLabel}\` {\`${safeField}\`: $value})
           WITH n ORDER BY n.\`${config.idField}\` LIMIT $limit
           WITH n, labels(n) AS labels
           OPTIONAL MATCH (n)-[:HAS_SUBTYPE_INSTANCE { tenant_id: $tenantId }]->(si:SubtypeInstance)
           RETURN n, labels, collect(DISTINCT { labels: labels(si), props: properties(si) }) AS subtypeInstances`
        : `MATCH (n:\`${safeLabel}\` {\`${safeField}\`: $value}) RETURN n, labels(n) AS labels ORDER BY n.\`${config.idField}\` LIMIT $limit`,
      tenantId
        ? { value: filterValue, limit: neo4j.int(limit), tenantId }
        : { value: filterValue, limit: neo4j.int(limit) },
    );

    return Promise.all(records.map(r => this.formatResult(r, tenantId)));
  }

  /**
   * Update an entity's properties.
   */
  async update(config: EntityConfig, id: string, dto: any) {
    // Ensure entity schema is registered (fallback if app startup failed)
    await this.schemaRegistration.ensureEntitySchema(config.key);

    const resolution = await this.resolution.resolveCanonicalEntityId(id);
    const resolvedId = resolution.canonicalEntityId;
    await this.assertEntityHasLabel(config, resolvedId);

    const safeLabel = this.neo4j.sanitizeIdentifier(config.label);
    const safeIdField = this.neo4j.sanitizeIdentifier(config.idField);
    const safeProps = this.sanitizePropertyKeys(config, dto);

    if (!Object.keys(safeProps).length) {
      throw new BadRequestException('No properties provided to update');
    }

    const setParts = Object.keys(safeProps)
      .map(k => `n.\`${k}\` = $prop_${k}`)
      .join(', ');

    const params: Record<string, any> = { id: resolvedId };
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
        `${config.displayName} with ${config.idField}=${resolvedId} not found`,
      );
    }

    const entity = await this.formatResult(records[0]);
    const identity = await this.resolution.buildMutationContextForEntity(id, true);

    return {
      ...entity,
      _identity: identity,
    };
  }

  /**
   * Delete an entity.
   */
  async remove(config: EntityConfig, id: string) {
    const identity = await this.resolution.buildMutationContextForEntity(id, false);
    const resolvedId = identity.canonicalEntityId;
    await this.assertEntityHasLabel(config, resolvedId);

    const safeLabel = this.neo4j.sanitizeIdentifier(config.label);
    const safeIdField = this.neo4j.sanitizeIdentifier(config.idField);
    const records = await this.neo4j.runQuery(
      `MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $id})
       DETACH DELETE n RETURN count(n) AS deleted`,
      { id: resolvedId },
    );

    if (!records[0].get('deleted').toNumber()) {
      throw new NotFoundException(
        `${config.displayName} with ${config.idField}=${resolvedId} not found`,
      );
    }

    return {
      deleted: true,
      id: resolvedId,
      requestedId: id,
      label: config.label,
      _identity: identity,
    };
  }

  async getPossibleDuplicates(config: EntityConfig, id: string, limit = 5) {
    const resolution = await this.resolution.resolveCanonicalEntityId(id);
    await this.assertEntityHasLabel(config, resolution.canonicalEntityId);

    return {
      requestedEntityId: id,
      canonicalEntityId: resolution.canonicalEntityId,
      suggestions: await this.resolution.getPossibleDuplicates(resolution.canonicalEntityId, limit),
    };
  }

  async merge(config: EntityConfig, primaryId: string, duplicateId: string, reason?: string) {
    const primaryResolution = await this.resolution.resolveCanonicalEntityId(primaryId);
    const duplicateResolution = await this.resolution.resolveCanonicalEntityId(duplicateId);

    await this.assertEntityHasLabel(config, primaryResolution.canonicalEntityId);
    await this.assertEntityHasLabel(config, duplicateResolution.canonicalEntityId);

    return this.resolution.mergeEntities(
      primaryResolution.canonicalEntityId,
      duplicateResolution.canonicalEntityId,
      reason,
    );
  }

  async unmerge(config: EntityConfig, mergeId: string) {
    const result = await this.resolution.unmergeEntities(mergeId);
    await this.assertEntityHasLabel(config, result.primaryEntityId);
    return result;
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
    skipFields.add('icon'); // icon is a type-level property, never stored per-node

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

  private async assertEntityHasLabel(config: EntityConfig, entityId: string) {
    const safeLabel = this.neo4j.sanitizeIdentifier(config.label);
    const safeIdField = this.neo4j.sanitizeIdentifier(config.idField);

    const records = await this.neo4j.runQuery(
      `MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $entityId})
       RETURN count(n) AS foundCount`,
      { entityId },
    );

    const foundCount = records[0]?.get('foundCount') as Integer;
    if (!foundCount || foundCount.toNumber() === 0) {
      throw new BadRequestException(
        `Entity ${entityId} is not a ${config.displayName}. Use /identity/merge for cross-type workflows.`,
      );
    }
  }

  private async ensureEntityBelongsToConfigIfExists(config: EntityConfig, entityId: string) {
    const safeIdField = this.neo4j.sanitizeIdentifier(config.idField);

    const records = await this.neo4j.runQuery(
      `MATCH (n:Entity {\`${safeIdField}\`: $entityId})
       RETURN labels(n) AS labels
       LIMIT 1`,
      { entityId },
    );

    if (!records.length) {
      return;
    }

    const labels = ((records[0].get('labels') as string[]) ?? []).map((label) => label.toLowerCase());
    if (!labels.includes(config.label.toLowerCase())) {
      throw new BadRequestException(
        `Entity ${entityId} exists but is not a ${config.displayName}`,
      );
    }
  }

  /**
   * Format a Neo4j record into a clean response object.
   */
  private async formatResult(record: any, tenantId?: string) {
    const properties = this.neo4j.toPlainObject(record.get('n').properties);
    const labels = record.get('labels') as string[];

    if (tenantId) {
      const subtypeInstances = record.has('subtypeInstances')
        ? (record.get('subtypeInstances') as Array<{ labels: string[]; props: Record<string, any> }> | null)
        : null;
      if (subtypeInstances) {
        const entityId = typeof properties.entity_id === 'string' ? properties.entity_id : undefined;
        return this.projection.projectTypedNodeWithInstances(properties, labels, subtypeInstances, entityId);
      }
    }

    return this.projection.projectTypedNode(properties, labels);
  }
}

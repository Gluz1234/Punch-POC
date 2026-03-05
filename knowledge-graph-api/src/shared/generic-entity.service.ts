import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { EntityConfig } from '../shared/entity-config';

/**
 * Generic Entity Service
 * Replaces all hardcoded services (PersonsService, CoursesService, etc.)
 * 
 * This is the single source of CRUD logic for all standard entities.
 * Add special cases as optional overrides, but most entities work out-of-the-box.
 */
@Injectable()
export class GenericEntityService {
  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Create or update (upsert) an entity.
   * Uses Cypher MERGE on the ID field to guarantee uniqueness.
   */
  async upsert(config: EntityConfig, dto: any) {
    if (!dto[config.idField]) {
      throw new BadRequestException(`${config.idField} is required`);
    }

    const idValue = dto[config.idField];
    const safeLabel = this.neo4j.sanitizeIdentifier(config.label);
    const safeIdField = this.neo4j.sanitizeIdentifier(config.idField);
    const safeProps = this.sanitizePropertyKeys(dto);

    // Build SET clauses for all properties
    const setParts = Object.keys(safeProps)
      .map(k => `n.\`${k}\` = $prop_${k}`)
      .join(', ');

    const params: Record<string, any> = { nodeId: String(idValue) };
    for (const [k, v] of Object.entries(safeProps)) {
      params[`prop_${k}`] = v;
    }

    const records = await this.neo4j.runQuery(`
      MERGE (n:\`${safeLabel}\` {\`${safeIdField}\`: $nodeId})
      ON CREATE SET ${setParts}
      ON MATCH SET ${setParts}
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
      { limit },
    );
    return records.map(r => this.formatResult(r));
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

    return records.map(r => this.formatResult(r));
  }

  /**
   * Update an entity's properties.
   */
  async update(config: EntityConfig, id: string, dto: any) {
    const safeLabel = this.neo4j.sanitizeIdentifier(config.label);
    const safeIdField = this.neo4j.sanitizeIdentifier(config.idField);
    const safeProps = this.sanitizePropertyKeys(dto);

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
  private sanitizePropertyKeys(dto: any): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(dto || {})) {
      // Skip internal/system fields
      if (
        ![
          'strongId',
          'personStrongId',
          'courseId',
          'orgId',
          'locationId',
          'skillId',
          'educationId',
          'departmentId',
        ].includes(k) &&
        v !== undefined &&
        v !== null
      ) {
        // Convert camelCase to snake_case for Neo4j
        const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = v;
      }
    }
    return result;
  }

  /**
   * Format a Neo4j record into a clean response object.
   */
  private formatResult(record: any) {
    return {
      ...this.neo4j.toPlainObject(record.get('n').properties),
      labels: record.get('labels'),
    };
  }
}

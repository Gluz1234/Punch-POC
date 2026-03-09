import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { int } from 'neo4j-driver';
import { randomUUID } from 'crypto';
import { Neo4jService } from '../neo4j/neo4j.service';
import { SchemaRegistrationService } from '../schema/schema-registration.service';
import { PromotionProjectionService } from '../promotions/promotion-projection.service';
import { EntityResolutionService } from '../shared/entity-resolution.service';

@Injectable()
export class DynamicService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly schemaRegistration: SchemaRegistrationService,
    private readonly projection: PromotionProjectionService,
    private readonly resolution: EntityResolutionService,
  ) {}

  // ── CREATE or UPSERT a node of any label(s) ───────────────────────────────
  // This is the core method for brand-new entity types that don't exist yet.
  // Labels, property keys, and relationship types are sanitized before being
  // interpolated into Cypher. Property values always travel as parameters.

  async upsertNode(dto: any) {
    if (!dto.labels?.length)  throw new BadRequestException('At least one label is required');

    const safeLabels = Array.from(new Set([...(dto.labels as string[]), 'Entity']))
      .map(l => this.neo4j.sanitizeIdentifier(l));
    const safeIdField = this.neo4j.sanitizeIdentifier(dto.idField ?? 'entity_id');
    const safeProps   = this.sanitizePropertyKeys(dto.properties ?? {});
    const requestedNodeId = (dto.id !== undefined && dto.id !== null && String(dto.id).trim())
      ? String(dto.id).trim()
      : randomUUID();
    const nodeId = this.isCanonicalIdField(safeIdField)
      ? await this.resolution.resolveCanonicalEntityIdIfExists(requestedNodeId)
      : requestedNodeId;

    if (dto.createConstraint) {
      await this.neo4j.createConstraintForLabel(safeLabels[0], safeIdField);
    }

    const labelStr  = safeLabels.map(l => `\`${l}\``).join(':');
    const setParts  = Object.keys(safeProps).map(k => `n.\`${k}\` = $prop_${k}`);
    const setClause = setParts.length ? `, ${setParts.join(', ')}` : '';

    const params: Record<string, any> = { nodeId };
    for (const [k, v] of Object.entries(safeProps)) params[`prop_${k}`] = v;

    const records = await this.neo4j.runQuery(`
      MERGE (n:${labelStr} {\`${safeIdField}\`: $nodeId})
      ON CREATE SET n.\`${safeIdField}\` = $nodeId${setClause}
      ON MATCH  SET n.\`${safeIdField}\` = $nodeId${setClause}
      RETURN n, labels(n) AS labels`,
      params,
    );

    const node = await this.projectNodeRecord(records[0]);
    const identity = this.isCanonicalIdField(safeIdField)
      ? await this.resolution.buildMutationContextForEntity(requestedNodeId, true)
      : await this.buildDraftIdentityContext(safeLabels[0], safeProps);

    return {
      ...node,
      _identity: identity,
    };
  }

  // ── GET all nodes of a given label ────────────────────────────────────────

  async findByLabel(label: string, limit = 100) {
    const safeLabel = this.neo4j.sanitizeIdentifier(label);
    const records   = await this.neo4j.runQuery(
      `MATCH (n:\`${safeLabel}\`) RETURN n, labels(n) AS labels LIMIT $limit`,
      { limit: int(limit) },
    );
    return Promise.all(records.map(r => this.projectNodeRecord(r)));
  }

  // ── GET a single node by label + idField + id ─────────────────────────────

  async findOne(label: string, idField: string, id: string) {
    const safeLabel   = this.neo4j.sanitizeIdentifier(label);
    const safeIdField = this.neo4j.sanitizeIdentifier(idField);
    const records     = await this.neo4j.runQuery(
      `MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $id}) RETURN n, labels(n) AS labels`,
      { id },
    );
    if (!records.length)
      throw new NotFoundException(`${label} where ${idField}=${id} not found`);
    return this.projectNodeRecord(records[0]);
  }

  // ── UPDATE properties on a dynamic node ──────────────────────────────────

  async updateNode(label: string, idField: string, id: string, properties: Record<string, any>) {
    const safeLabel   = this.neo4j.sanitizeIdentifier(label);
    const safeIdField = this.neo4j.sanitizeIdentifier(idField);
    const safeProps   = this.sanitizePropertyKeys(properties);
    const resolvedId = this.isCanonicalIdField(safeIdField)
      ? (await this.resolution.resolveCanonicalEntityId(id)).canonicalEntityId
      : id;

    if (!Object.keys(safeProps).length)
      throw new BadRequestException('No properties provided to update');

    const setParts = Object.keys(safeProps).map(k => `n.\`${k}\` = $prop_${k}`);
    const params: Record<string, any> = { id: resolvedId };
    for (const [k, v] of Object.entries(safeProps)) params[`prop_${k}`] = v;

    const records = await this.neo4j.runQuery(
      `MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $id})
       SET ${setParts.join(', ')}
       RETURN n, labels(n) AS labels`,
      params,
    );
    if (!records.length)
      throw new NotFoundException(`${label} where ${idField}=${id} not found`);

    const node = await this.projectNodeRecord(records[0]);
    const identity = this.isCanonicalIdField(safeIdField)
      ? await this.resolution.buildMutationContextForEntity(id, true)
      : await this.buildDraftIdentityContext(safeLabel, safeProps);

    return {
      ...node,
      _identity: identity,
    };
  }

  // ── DELETE a dynamic node ─────────────────────────────────────────────────

  async deleteNode(label: string, idField: string, id: string) {
    const safeLabel   = this.neo4j.sanitizeIdentifier(label);
    const safeIdField = this.neo4j.sanitizeIdentifier(idField);
    const identity = this.isCanonicalIdField(safeIdField)
      ? await this.resolution.buildMutationContextForEntity(id, false)
      : null;
    const resolvedId = identity?.canonicalEntityId ?? id;

    const records     = await this.neo4j.runQuery(
      `MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $id})
       DETACH DELETE n RETURN count(n) AS deleted`,
      { id: resolvedId },
    );
    if (!records[0].get('deleted').toNumber())
      throw new NotFoundException(`${label} where ${idField}=${id} not found`);

    return {
      deleted: true,
      label,
      idField,
      id: resolvedId,
      requestedId: id,
      ...(identity ? { _identity: identity } : {}),
    };
  }

  // ── ADD a label to an existing node (dynamic promotion) ───────────────────

  async addLabel(label: string, idField: string, id: string, newLabel: string) {
    const safeLabel    = this.neo4j.sanitizeIdentifier(label);
    const safeIdField  = this.neo4j.sanitizeIdentifier(idField);
    const safeNewLabel = this.neo4j.sanitizeIdentifier(newLabel);
    const resolvedId = this.isCanonicalIdField(safeIdField)
      ? (await this.resolution.resolveCanonicalEntityId(id)).canonicalEntityId
      : id;

    const records      = await this.neo4j.runQuery(
      `MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $id})
       SET n:\`${safeNewLabel}\`
       RETURN n, labels(n) AS labels`,
      { id: resolvedId },
    );
    if (!records.length)
      throw new NotFoundException(`${label} where ${idField}=${id} not found`);

    const node = await this.projectNodeRecord(records[0]);
    const identity = this.isCanonicalIdField(safeIdField)
      ? await this.resolution.buildMutationContextForEntity(id, true)
      : await this.buildDraftIdentityContext(safeLabel, {});

    return {
      ...node,
      _identity: identity,
    };
  }

  // ── CREATE a relationship between any two nodes ───────────────────────────

  async createRelationship(dto: any) {
    if (!dto.type) throw new BadRequestException('Relationship type is required');

    const safeFromLabel   = this.neo4j.sanitizeIdentifier(dto.fromLabel);
    const safeFromIdField = this.neo4j.sanitizeIdentifier(dto.fromIdField);
    const safeToLabel     = this.neo4j.sanitizeIdentifier(dto.toLabel);
    const safeToIdField   = this.neo4j.sanitizeIdentifier(dto.toIdField);
    const safeType        = this.neo4j.sanitizeIdentifier(dto.type);
    const safeProps       = this.sanitizePropertyKeys(dto.properties ?? {});

    const requestedFromId = String(dto.fromId);
    const requestedToId = String(dto.toId);
    const fromId = this.isCanonicalIdField(safeFromIdField)
      ? await this.resolution.resolveCanonicalEntityIdIfExists(requestedFromId)
      : requestedFromId;
    const toId = this.isCanonicalIdField(safeToIdField)
      ? await this.resolution.resolveCanonicalEntityIdIfExists(requestedToId)
      : requestedToId;

    const setParts  = Object.keys(safeProps).map(k => `r.\`${k}\` = $prop_${k}`);
    const setClause = setParts.length ? `SET ${setParts.join(', ')}` : '';

    const params: Record<string, any> = {
      fromId,
      toId,
      createdAt: new Date().toISOString(),
    };
    for (const [k, v] of Object.entries(safeProps)) params[`prop_${k}`] = v;

    const records = await this.neo4j.runQuery(`
      MATCH (from:\`${safeFromLabel}\` {\`${safeFromIdField}\`: $fromId})
      MATCH (to:\`${safeToLabel}\`     {\`${safeToIdField}\`:   $toId})
      MERGE (from)-[r:\`${safeType}\`]->(to)
      ON CREATE SET r.created_at = $createdAt
      ${setClause}
      RETURN type(r)      AS relType,
             properties(r) AS relProps,
             labels(from)  AS fromLabels,
             labels(to)    AS toLabels`,
      params,
    );
    if (!records.length)
      throw new NotFoundException('One or both nodes not found — relationship not created');

    const identityEntries = await Promise.all([
      this.isCanonicalIdField(safeFromIdField)
        ? this.resolution.buildMutationContextForEntity(requestedFromId, true)
        : Promise.resolve(null),
      this.isCanonicalIdField(safeToIdField)
        ? this.resolution.buildMutationContextForEntity(requestedToId, true)
        : Promise.resolve(null),
    ]);

    const identity: Record<string, any> = {};
    if (identityEntries[0]) {
      identity.source = identityEntries[0];
    }
    if (identityEntries[1]) {
      identity.target = identityEntries[1];
    }

    return {
      type:       records[0].get('relType'),
      properties: this.neo4j.toPlainObject(records[0].get('relProps')),
      from:       { labels: records[0].get('fromLabels'), id: fromId, requestedId: requestedFromId },
      to:         { labels: records[0].get('toLabels'),   id: toId, requestedId: requestedToId },
      ...(Object.keys(identity).length ? { _identity: identity } : {}),
    };
  }

  // ── GET relationships for any node ───────────────────────────────────────

  async getRelationships(label: string, idField: string, id: string, direction = 'both') {
    const safeLabel   = this.neo4j.sanitizeIdentifier(label);
    const safeIdField = this.neo4j.sanitizeIdentifier(idField);

    const pattern =
      direction === 'out'  ? '(n)-[r]->(m)'  :
      direction === 'in'   ? '(n)<-[r]-(m)'  :
                             '(n)-[r]-(m)';

    const records = await this.neo4j.runQuery(`
      MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $id})
      MATCH ${pattern}
      RETURN type(r)        AS relType,
             properties(r)  AS relProps,
             labels(m)      AS otherLabels,
             COALESCE(m.entity_id, m.name, m.strong_id, m.org_id, m.skill_id,
                      m.location_id, m.education_id, m.course_id,
                      m.department_id, m.id) AS otherId`,
      { id },
    );
    return records.map(r => ({
      type:       r.get('relType'),
      properties: this.neo4j.toPlainObject(r.get('relProps')),
      otherNode:  { labels: r.get('otherLabels'), id: r.get('otherId') },
    }));
  }

  // ── DELETE a dynamic relationship ────────────────────────────────────────

  async deleteRelationship(dto: any) {
    const safeFromLabel   = this.neo4j.sanitizeIdentifier(dto.fromLabel);
    const safeFromIdField = this.neo4j.sanitizeIdentifier(dto.fromIdField);
    const safeToLabel     = this.neo4j.sanitizeIdentifier(dto.toLabel);
    const safeToIdField   = this.neo4j.sanitizeIdentifier(dto.toIdField);
    const safeType        = this.neo4j.sanitizeIdentifier(dto.type);

    const requestedFromId = String(dto.fromId);
    const requestedToId = String(dto.toId);
    const fromId = this.isCanonicalIdField(safeFromIdField)
      ? await this.resolution.resolveCanonicalEntityIdIfExists(requestedFromId)
      : requestedFromId;
    const toId = this.isCanonicalIdField(safeToIdField)
      ? await this.resolution.resolveCanonicalEntityIdIfExists(requestedToId)
      : requestedToId;

    await this.neo4j.runQuery(`
      MATCH (from:\`${safeFromLabel}\` {\`${safeFromIdField}\`: $fromId})
            -[r:\`${safeType}\`]->
            (to:\`${safeToLabel}\`   {\`${safeToIdField}\`:   $toId})
      DELETE r`,
      { fromId, toId },
    );

    const identityEntries = await Promise.all([
      this.isCanonicalIdField(safeFromIdField)
        ? this.resolution.buildMutationContextForEntity(requestedFromId, false)
        : Promise.resolve(null),
      this.isCanonicalIdField(safeToIdField)
        ? this.resolution.buildMutationContextForEntity(requestedToId, false)
        : Promise.resolve(null),
    ]);

    const identity: Record<string, any> = {};
    if (identityEntries[0]) {
      identity.source = identityEntries[0];
    }
    if (identityEntries[1]) {
      identity.target = identityEntries[1];
    }

    return {
      deleted: true,
      type: dto.type,
      fromId,
      toId,
      requestedFromId,
      requestedToId,
      ...(Object.keys(identity).length ? { _identity: identity } : {}),
    };
  }

  // ── SMART CREATE: auto-detect or register type, then create node ────────

  async smartCreate(dto: { label?: string; properties?: Record<string, any>; fields?: Record<string, any> }) {
    if (!this.isObjectRecord(dto)) {
      throw new BadRequestException('Request body must be an object');
    }

    const label = typeof dto.label === 'string' ? dto.label.trim() : '';
    if (!label) throw new BadRequestException('label is required');

    const incomingProps = dto.properties ?? dto.fields ?? {};
    if (!this.isObjectRecord(incomingProps)) {
      throw new BadRequestException('properties (or fields) must be an object');
    }

    const safeLabel = this.neo4j.sanitizeIdentifier(label);
    const safeProps = this.sanitizePropertyKeys(incomingProps);

    // Check if this type already has a registered schema
    const existingSchema = await this.schemaRegistration.getEntitySchema(safeLabel);
    const idField = 'entity_id';
    const safeIdField = this.neo4j.sanitizeIdentifier(idField);

    if (!existingSchema) {
      // Register a new schema type based on the incoming data
      const schemaProps: Array<{ name: string; type: string }> = [
        { name: idField, type: 'STRING' },
      ];
      for (const [key, value] of Object.entries(safeProps)) {
        if (key === idField) continue;
        schemaProps.push({ name: key, type: this.inferType(value) });
      }

      await this.schemaRegistration.upsertEntitySchema({
        key: safeLabel.toLowerCase(),
        label: safeLabel,
        properties: schemaProps,
      });

      // Create a unique constraint on the auto-generated id field
      await this.neo4j.createConstraintForLabel(safeLabel, safeIdField);
    }

    // Use caller-provided entity_id if present; otherwise generate one.
    const providedEntityId =
      typeof safeProps[idField] === 'string' && safeProps[idField].trim()
        ? safeProps[idField].trim()
        : undefined;
    const requestedNodeId = providedEntityId ?? randomUUID();
    const nodeId = await this.resolution.resolveCanonicalEntityIdIfExists(requestedNodeId);

    // Do not SET entity_id from payload again; MERGE key already controls it.
    const { [idField]: _ignoredEntityId, ...writableProps } = safeProps;

    // Build SET clause from properties
    const setParts = Object.keys(writableProps).map(k => `n.\`${k}\` = $prop_${k}`);
    const setClause = setParts.length ? `, ${setParts.join(', ')}` : '';

    const params: Record<string, any> = { nodeId };
    for (const [k, v] of Object.entries(writableProps)) params[`prop_${k}`] = v;

    const records = await this.neo4j.runQuery(
      `MERGE (n:\`${safeLabel}\`:Entity {\`${safeIdField}\`: $nodeId})
       ON CREATE SET n.\`${safeIdField}\` = $nodeId${setClause}
       ON MATCH  SET n.\`${safeIdField}\` = $nodeId${setClause}
       RETURN n, labels(n) AS labels`,
      params,
    );

    const node = await this.projectNodeRecord(records[0]);
    const identity = await this.resolution.buildMutationContextForEntity(requestedNodeId, true);

    return {
      ...node,
      _identity: identity,
    };
  }

  private inferType(value: any): string {
    if (typeof value === 'number') return Number.isInteger(value) ? 'INTEGER' : 'FLOAT';
    if (typeof value === 'boolean') return 'BOOLEAN';
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'DATE';
      return 'STRING';
    }
    return 'STRING';
  }

  // ── Sanitize property key names ───────────────────────────────────────────

  private sanitizePropertyKeys(props: Record<string, any>): Record<string, any> {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(props)) {
      clean[this.neo4j.sanitizeIdentifier(key)] = value;
    }
    return clean;
  }

  private isCanonicalIdField(idField: string): boolean {
    return idField.toLowerCase() === 'entity_id';
  }

  private async buildDraftIdentityContext(label: string, properties: Record<string, any>) {
    const possibleDuplicates = await this.resolution.getPossibleDuplicatesForDraft(
      label,
      properties,
      undefined,
      5,
    );

    return {
      requestedEntityId: null,
      canonicalEntityId: null,
      wasMergedAlias: false,
      mergePath: [],
      possibleDuplicates,
      duplicateCount: possibleDuplicates.length,
    };
  }

  private isObjectRecord(value: unknown): value is Record<string, any> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  private async projectNodeRecord(record: any) {
    const properties = this.neo4j.toPlainObject(record.get('n').properties);
    const labels = record.get('labels') as string[];
    return this.projection.projectTypedNode(properties, labels);
  }
}

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class DynamicService {
  constructor(private readonly neo4j: Neo4jService) {}

  // ── CREATE or UPSERT a node of any label(s) ───────────────────────────────
  // This is the core method for brand-new entity types that don't exist yet.
  // Labels, property keys, and relationship types are sanitized before being
  // interpolated into Cypher. Property values always travel as parameters.

  async upsertNode(dto: any) {
    if (!dto.labels?.length)  throw new BadRequestException('At least one label is required');
    if (!dto.idField)         throw new BadRequestException('idField is required');
    if (dto.id === undefined) throw new BadRequestException('id is required');

    const safeLabels  = (dto.labels as string[]).map(l => this.neo4j.sanitizeIdentifier(l));
    const safeIdField = this.neo4j.sanitizeIdentifier(dto.idField);
    const safeProps   = this.sanitizePropertyKeys(dto.properties ?? {});

    if (dto.createConstraint) {
      await this.neo4j.createConstraintForLabel(safeLabels[0], safeIdField);
    }

    const labelStr  = safeLabels.map(l => `\`${l}\``).join(':');
    const setParts  = Object.keys(safeProps).map(k => `n.\`${k}\` = $prop_${k}`);
    const setClause = setParts.length ? `, ${setParts.join(', ')}` : '';

    const params: Record<string, any> = { nodeId: String(dto.id) };
    for (const [k, v] of Object.entries(safeProps)) params[`prop_${k}`] = v;

    const records = await this.neo4j.runQuery(`
      MERGE (n:${labelStr} {\`${safeIdField}\`: $nodeId})
      ON CREATE SET n.\`${safeIdField}\` = $nodeId${setClause}
      ON MATCH  SET n.\`${safeIdField}\` = $nodeId${setClause}
      RETURN n, labels(n) AS labels`,
      params,
    );
    return {
      ...this.neo4j.toPlainObject(records[0].get('n').properties),
      labels: records[0].get('labels'),
    };
  }

  // ── GET all nodes of a given label ────────────────────────────────────────

  async findByLabel(label: string, limit = 100) {
    const safeLabel = this.neo4j.sanitizeIdentifier(label);
    const records   = await this.neo4j.runQuery(
      `MATCH (n:\`${safeLabel}\`) RETURN n, labels(n) AS labels LIMIT $limit`,
      { limit },
    );
    return records.map(r => ({
      ...this.neo4j.toPlainObject(r.get('n').properties),
      labels: r.get('labels'),
    }));
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
    return {
      ...this.neo4j.toPlainObject(records[0].get('n').properties),
      labels: records[0].get('labels'),
    };
  }

  // ── UPDATE properties on a dynamic node ──────────────────────────────────

  async updateNode(label: string, idField: string, id: string, properties: Record<string, any>) {
    const safeLabel   = this.neo4j.sanitizeIdentifier(label);
    const safeIdField = this.neo4j.sanitizeIdentifier(idField);
    const safeProps   = this.sanitizePropertyKeys(properties);

    if (!Object.keys(safeProps).length)
      throw new BadRequestException('No properties provided to update');

    const setParts = Object.keys(safeProps).map(k => `n.\`${k}\` = $prop_${k}`);
    const params: Record<string, any> = { id };
    for (const [k, v] of Object.entries(safeProps)) params[`prop_${k}`] = v;

    const records = await this.neo4j.runQuery(
      `MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $id})
       SET ${setParts.join(', ')}
       RETURN n, labels(n) AS labels`,
      params,
    );
    if (!records.length)
      throw new NotFoundException(`${label} where ${idField}=${id} not found`);
    return {
      ...this.neo4j.toPlainObject(records[0].get('n').properties),
      labels: records[0].get('labels'),
    };
  }

  // ── DELETE a dynamic node ─────────────────────────────────────────────────

  async deleteNode(label: string, idField: string, id: string) {
    const safeLabel   = this.neo4j.sanitizeIdentifier(label);
    const safeIdField = this.neo4j.sanitizeIdentifier(idField);
    const records     = await this.neo4j.runQuery(
      `MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $id})
       DETACH DELETE n RETURN count(n) AS deleted`,
      { id },
    );
    if (!records[0].get('deleted').toNumber())
      throw new NotFoundException(`${label} where ${idField}=${id} not found`);
    return { deleted: true, label, idField, id };
  }

  // ── ADD a label to an existing node (dynamic promotion) ───────────────────

  async addLabel(label: string, idField: string, id: string, newLabel: string) {
    const safeLabel    = this.neo4j.sanitizeIdentifier(label);
    const safeIdField  = this.neo4j.sanitizeIdentifier(idField);
    const safeNewLabel = this.neo4j.sanitizeIdentifier(newLabel);
    const records      = await this.neo4j.runQuery(
      `MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $id})
       SET n:\`${safeNewLabel}\`
       RETURN n, labels(n) AS labels`,
      { id },
    );
    if (!records.length)
      throw new NotFoundException(`${label} where ${idField}=${id} not found`);
    return {
      ...this.neo4j.toPlainObject(records[0].get('n').properties),
      labels: records[0].get('labels'),
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

    const setParts  = Object.keys(safeProps).map(k => `r.\`${k}\` = $prop_${k}`);
    const setClause = setParts.length ? `SET ${setParts.join(', ')}` : '';

    const params: Record<string, any> = {
      fromId:    String(dto.fromId),
      toId:      String(dto.toId),
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

    return {
      type:       records[0].get('relType'),
      properties: this.neo4j.toPlainObject(records[0].get('relProps')),
      from:       { labels: records[0].get('fromLabels'), id: dto.fromId },
      to:         { labels: records[0].get('toLabels'),   id: dto.toId },
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
             COALESCE(m.name, m.strong_id, m.org_id, m.skill_id,
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

    await this.neo4j.runQuery(`
      MATCH (from:\`${safeFromLabel}\` {\`${safeFromIdField}\`: $fromId})
            -[r:\`${safeType}\`]->
            (to:\`${safeToLabel}\`   {\`${safeToIdField}\`:   $toId})
      DELETE r`,
      { fromId: String(dto.fromId), toId: String(dto.toId) },
    );
    return { deleted: true, type: dto.type, fromId: dto.fromId, toId: dto.toId };
  }

  // ── Sanitize property key names ───────────────────────────────────────────

  private sanitizePropertyKeys(props: Record<string, any>): Record<string, any> {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(props)) {
      clean[this.neo4j.sanitizeIdentifier(key)] = value;
    }
    return clean;
  }
}

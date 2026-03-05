"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../neo4j/neo4j.service");
let DynamicService = class DynamicService {
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async upsertNode(dto) {
        if (!dto.labels?.length)
            throw new common_1.BadRequestException('At least one label is required');
        if (!dto.idField)
            throw new common_1.BadRequestException('idField is required');
        if (dto.id === undefined)
            throw new common_1.BadRequestException('id is required');
        const safeLabels = dto.labels.map(l => this.neo4j.sanitizeIdentifier(l));
        const safeIdField = this.neo4j.sanitizeIdentifier(dto.idField);
        const safeProps = this.sanitizePropertyKeys(dto.properties ?? {});
        if (dto.createConstraint) {
            await this.neo4j.createConstraintForLabel(safeLabels[0], safeIdField);
        }
        const labelStr = safeLabels.map(l => `\`${l}\``).join(':');
        const setParts = Object.keys(safeProps).map(k => `n.\`${k}\` = $prop_${k}`);
        const setClause = setParts.length ? `, ${setParts.join(', ')}` : '';
        const params = { nodeId: String(dto.id) };
        for (const [k, v] of Object.entries(safeProps))
            params[`prop_${k}`] = v;
        const records = await this.neo4j.runQuery(`
      MERGE (n:${labelStr} {\`${safeIdField}\`: $nodeId})
      ON CREATE SET n.\`${safeIdField}\` = $nodeId${setClause}
      ON MATCH  SET n.\`${safeIdField}\` = $nodeId${setClause}
      RETURN n, labels(n) AS labels`, params);
        return {
            ...this.neo4j.toPlainObject(records[0].get('n').properties),
            labels: records[0].get('labels'),
        };
    }
    async findByLabel(label, limit = 100) {
        const safeLabel = this.neo4j.sanitizeIdentifier(label);
        const records = await this.neo4j.runQuery(`MATCH (n:\`${safeLabel}\`) RETURN n, labels(n) AS labels LIMIT $limit`, { limit });
        return records.map(r => ({
            ...this.neo4j.toPlainObject(r.get('n').properties),
            labels: r.get('labels'),
        }));
    }
    async findOne(label, idField, id) {
        const safeLabel = this.neo4j.sanitizeIdentifier(label);
        const safeIdField = this.neo4j.sanitizeIdentifier(idField);
        const records = await this.neo4j.runQuery(`MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $id}) RETURN n, labels(n) AS labels`, { id });
        if (!records.length)
            throw new common_1.NotFoundException(`${label} where ${idField}=${id} not found`);
        return {
            ...this.neo4j.toPlainObject(records[0].get('n').properties),
            labels: records[0].get('labels'),
        };
    }
    async updateNode(label, idField, id, properties) {
        const safeLabel = this.neo4j.sanitizeIdentifier(label);
        const safeIdField = this.neo4j.sanitizeIdentifier(idField);
        const safeProps = this.sanitizePropertyKeys(properties);
        if (!Object.keys(safeProps).length)
            throw new common_1.BadRequestException('No properties provided to update');
        const setParts = Object.keys(safeProps).map(k => `n.\`${k}\` = $prop_${k}`);
        const params = { id };
        for (const [k, v] of Object.entries(safeProps))
            params[`prop_${k}`] = v;
        const records = await this.neo4j.runQuery(`MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $id})
       SET ${setParts.join(', ')}
       RETURN n, labels(n) AS labels`, params);
        if (!records.length)
            throw new common_1.NotFoundException(`${label} where ${idField}=${id} not found`);
        return {
            ...this.neo4j.toPlainObject(records[0].get('n').properties),
            labels: records[0].get('labels'),
        };
    }
    async deleteNode(label, idField, id) {
        const safeLabel = this.neo4j.sanitizeIdentifier(label);
        const safeIdField = this.neo4j.sanitizeIdentifier(idField);
        const records = await this.neo4j.runQuery(`MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $id})
       DETACH DELETE n RETURN count(n) AS deleted`, { id });
        if (!records[0].get('deleted').toNumber())
            throw new common_1.NotFoundException(`${label} where ${idField}=${id} not found`);
        return { deleted: true, label, idField, id };
    }
    async addLabel(label, idField, id, newLabel) {
        const safeLabel = this.neo4j.sanitizeIdentifier(label);
        const safeIdField = this.neo4j.sanitizeIdentifier(idField);
        const safeNewLabel = this.neo4j.sanitizeIdentifier(newLabel);
        const records = await this.neo4j.runQuery(`MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $id})
       SET n:\`${safeNewLabel}\`
       RETURN n, labels(n) AS labels`, { id });
        if (!records.length)
            throw new common_1.NotFoundException(`${label} where ${idField}=${id} not found`);
        return {
            ...this.neo4j.toPlainObject(records[0].get('n').properties),
            labels: records[0].get('labels'),
        };
    }
    async createRelationship(dto) {
        if (!dto.type)
            throw new common_1.BadRequestException('Relationship type is required');
        const safeFromLabel = this.neo4j.sanitizeIdentifier(dto.fromLabel);
        const safeFromIdField = this.neo4j.sanitizeIdentifier(dto.fromIdField);
        const safeToLabel = this.neo4j.sanitizeIdentifier(dto.toLabel);
        const safeToIdField = this.neo4j.sanitizeIdentifier(dto.toIdField);
        const safeType = this.neo4j.sanitizeIdentifier(dto.type);
        const safeProps = this.sanitizePropertyKeys(dto.properties ?? {});
        const setParts = Object.keys(safeProps).map(k => `r.\`${k}\` = $prop_${k}`);
        const setClause = setParts.length ? `SET ${setParts.join(', ')}` : '';
        const params = {
            fromId: String(dto.fromId),
            toId: String(dto.toId),
            createdAt: new Date().toISOString(),
        };
        for (const [k, v] of Object.entries(safeProps))
            params[`prop_${k}`] = v;
        const records = await this.neo4j.runQuery(`
      MATCH (from:\`${safeFromLabel}\` {\`${safeFromIdField}\`: $fromId})
      MATCH (to:\`${safeToLabel}\`     {\`${safeToIdField}\`:   $toId})
      MERGE (from)-[r:\`${safeType}\`]->(to)
      ON CREATE SET r.created_at = $createdAt
      ${setClause}
      RETURN type(r)      AS relType,
             properties(r) AS relProps,
             labels(from)  AS fromLabels,
             labels(to)    AS toLabels`, params);
        if (!records.length)
            throw new common_1.NotFoundException('One or both nodes not found — relationship not created');
        return {
            type: records[0].get('relType'),
            properties: this.neo4j.toPlainObject(records[0].get('relProps')),
            from: { labels: records[0].get('fromLabels'), id: dto.fromId },
            to: { labels: records[0].get('toLabels'), id: dto.toId },
        };
    }
    async getRelationships(label, idField, id, direction = 'both') {
        const safeLabel = this.neo4j.sanitizeIdentifier(label);
        const safeIdField = this.neo4j.sanitizeIdentifier(idField);
        const pattern = direction === 'out' ? '(n)-[r]->(m)' :
            direction === 'in' ? '(n)<-[r]-(m)' :
                '(n)-[r]-(m)';
        const records = await this.neo4j.runQuery(`
      MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $id})
      MATCH ${pattern}
      RETURN type(r)        AS relType,
             properties(r)  AS relProps,
             labels(m)      AS otherLabels,
             COALESCE(m.name, m.strong_id, m.org_id, m.skill_id,
                      m.location_id, m.education_id, m.course_id,
                      m.department_id, m.id) AS otherId`, { id });
        return records.map(r => ({
            type: r.get('relType'),
            properties: this.neo4j.toPlainObject(r.get('relProps')),
            otherNode: { labels: r.get('otherLabels'), id: r.get('otherId') },
        }));
    }
    async deleteRelationship(dto) {
        const safeFromLabel = this.neo4j.sanitizeIdentifier(dto.fromLabel);
        const safeFromIdField = this.neo4j.sanitizeIdentifier(dto.fromIdField);
        const safeToLabel = this.neo4j.sanitizeIdentifier(dto.toLabel);
        const safeToIdField = this.neo4j.sanitizeIdentifier(dto.toIdField);
        const safeType = this.neo4j.sanitizeIdentifier(dto.type);
        await this.neo4j.runQuery(`
      MATCH (from:\`${safeFromLabel}\` {\`${safeFromIdField}\`: $fromId})
            -[r:\`${safeType}\`]->
            (to:\`${safeToLabel}\`   {\`${safeToIdField}\`:   $toId})
      DELETE r`, { fromId: String(dto.fromId), toId: String(dto.toId) });
        return { deleted: true, type: dto.type, fromId: dto.fromId, toId: dto.toId };
    }
    sanitizePropertyKeys(props) {
        const clean = {};
        for (const [key, value] of Object.entries(props)) {
            clean[this.neo4j.sanitizeIdentifier(key)] = value;
        }
        return clean;
    }
};
exports.DynamicService = DynamicService;
exports.DynamicService = DynamicService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], DynamicService);
//# sourceMappingURL=dynamic.service.js.map
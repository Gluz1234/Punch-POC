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
exports.GenericEntityService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_driver_1 = require("neo4j-driver");
const neo4j_service_1 = require("../neo4j/neo4j.service");
let GenericEntityService = class GenericEntityService {
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async upsert(config, dto) {
        if (!dto[config.idField]) {
            throw new common_1.BadRequestException(`${config.idField} is required`);
        }
        const idValue = dto[config.idField];
        const safeLabel = this.neo4j.sanitizeIdentifier(config.label);
        const safeIdField = this.neo4j.sanitizeIdentifier(config.idField);
        const safeProps = this.sanitizePropertyKeys(dto);
        const setParts = Object.keys(safeProps)
            .map(k => `n.\`${k}\` = $prop_${k}`)
            .join(', ');
        const params = { nodeId: String(idValue) };
        for (const [k, v] of Object.entries(safeProps)) {
            params[`prop_${k}`] = v;
        }
        const records = await this.neo4j.runQuery(`
      MERGE (n:\`${safeLabel}\` {\`${safeIdField}\`: $nodeId})
      ON CREATE SET ${setParts}
      ON MATCH SET ${setParts}
      RETURN n, labels(n) AS labels`, params);
        return this.formatResult(records[0]);
    }
    async findAll(config, limit = 1000) {
        const safeLabel = this.neo4j.sanitizeIdentifier(config.label);
        const records = await this.neo4j.runQuery(`MATCH (n:\`${safeLabel}\`) RETURN n, labels(n) AS labels ORDER BY n.\`${config.idField}\` LIMIT $limit`, { limit: neo4j_driver_1.default.int(limit) });
        return records.map(r => this.formatResult(r));
    }
    async findOne(config, id) {
        const safeLabel = this.neo4j.sanitizeIdentifier(config.label);
        const safeIdField = this.neo4j.sanitizeIdentifier(config.idField);
        const records = await this.neo4j.runQuery(`MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $id}) RETURN n, labels(n) AS labels`, { id });
        if (!records.length) {
            throw new common_1.NotFoundException(`${config.displayName} with ${config.idField}=${id} not found`);
        }
        return this.formatResult(records[0]);
    }
    async findBy(config, filterField, filterValue, limit = 1000) {
        const safeLabel = this.neo4j.sanitizeIdentifier(config.label);
        const safeField = this.neo4j.sanitizeIdentifier(filterField);
        const records = await this.neo4j.runQuery(`MATCH (n:\`${safeLabel}\` {\`${safeField}\`: $value}) RETURN n, labels(n) AS labels ORDER BY n.\`${config.idField}\` LIMIT $limit`, { value: filterValue, limit });
        return records.map(r => this.formatResult(r));
    }
    async update(config, id, dto) {
        const safeLabel = this.neo4j.sanitizeIdentifier(config.label);
        const safeIdField = this.neo4j.sanitizeIdentifier(config.idField);
        const safeProps = this.sanitizePropertyKeys(dto);
        if (!Object.keys(safeProps).length) {
            throw new common_1.BadRequestException('No properties provided to update');
        }
        const setParts = Object.keys(safeProps)
            .map(k => `n.\`${k}\` = $prop_${k}`)
            .join(', ');
        const params = { id };
        for (const [k, v] of Object.entries(safeProps)) {
            params[`prop_${k}`] = v;
        }
        const records = await this.neo4j.runQuery(`MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $id})
       SET ${setParts}
       RETURN n, labels(n) AS labels`, params);
        if (!records.length) {
            throw new common_1.NotFoundException(`${config.displayName} with ${config.idField}=${id} not found`);
        }
        return this.formatResult(records[0]);
    }
    async remove(config, id) {
        const safeLabel = this.neo4j.sanitizeIdentifier(config.label);
        const safeIdField = this.neo4j.sanitizeIdentifier(config.idField);
        const records = await this.neo4j.runQuery(`MATCH (n:\`${safeLabel}\` {\`${safeIdField}\`: $id})
       DETACH DELETE n RETURN count(n) AS deleted`, { id });
        if (!records[0].get('deleted').toNumber()) {
            throw new common_1.NotFoundException(`${config.displayName} with ${config.idField}=${id} not found`);
        }
        return { deleted: true, id, label: config.label };
    }
    sanitizePropertyKeys(dto) {
        const result = {};
        for (const [k, v] of Object.entries(dto || {})) {
            if (![
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
                v !== null) {
                const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                result[snakeKey] = v;
            }
        }
        return result;
    }
    formatResult(record) {
        return {
            ...this.neo4j.toPlainObject(record.get('n').properties),
            labels: record.get('labels'),
        };
    }
};
exports.GenericEntityService = GenericEntityService;
exports.GenericEntityService = GenericEntityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], GenericEntityService);
//# sourceMappingURL=generic-entity.service.js.map
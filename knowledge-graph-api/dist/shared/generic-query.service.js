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
exports.GenericQueryService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_driver_1 = require("neo4j-driver");
const neo4j_service_1 = require("../neo4j/neo4j.service");
const entity_config_1 = require("./entity-config");
let GenericQueryService = class GenericQueryService {
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async execute(config) {
        const { query, params } = this.buildQuery(config);
        const records = await this.neo4j.runQuery(query, params);
        return records.map(r => this.formatResult(r, config.returns));
    }
    buildQuery(config) {
        const params = {};
        const parts = [];
        const matchParts = this.buildMatchClauses(config, params);
        parts.push(`MATCH ${matchParts.join('')}`);
        const whereClauses = this.buildWhereClauses(config, params);
        if (whereClauses.length) {
            parts.push(`WHERE ${whereClauses.join(' AND ')}`);
        }
        const selectClause = config.distinct ? 'RETURN DISTINCT' : 'RETURN';
        parts.push(`${selectClause} ${config.returns.join(', ')}`);
        if (config.orderBy) {
            parts.push(`ORDER BY ${config.orderBy}`);
        }
        if (config.limit) {
            params.limit = neo4j_driver_1.default.int(config.limit);
            parts.push('LIMIT $limit');
        }
        return {
            query: parts.join('\n'),
            params,
        };
    }
    buildMatchClauses(config, params) {
        const clauses = [];
        const mainAlias = config.mainEntity.alias;
        const mainLabel = config.mainEntity.config.label;
        const mainIdField = config.mainEntity.config.idField;
        let mainMatch = `(${mainAlias}:\`${mainLabel}\``;
        if (config.mainEntity.filterFields && Object.keys(config.mainEntity.filterFields).length) {
            const filterParts = [];
            for (const [field, value] of Object.entries(config.mainEntity.filterFields)) {
                const paramKey = `main_${field}`;
                params[paramKey] = value;
                filterParts.push(`${mainAlias}.\`${field}\` = $${paramKey}`);
            }
            mainMatch += ` { ${filterParts.join(', ')} }`;
        }
        mainMatch += ')';
        clauses.push(mainMatch);
        if (config.relationships && config.relationships.length) {
            for (let i = 0; i < config.relationships.length; i++) {
                const rel = config.relationships[i];
                const targetAlias = rel.targetEntity.alias;
                const targetLabel = rel.targetEntity.config.label;
                let relMatch = '';
                if (rel.direction === '->') {
                    relMatch = `(${mainAlias})-[r${i}:\`${rel.type}\``;
                }
                else if (rel.direction === '<-') {
                    relMatch = `(${mainAlias})<-[r${i}:\`${rel.type}\``;
                }
                else {
                    relMatch = `(${mainAlias})-[r${i}:\`${rel.type}\``;
                }
                if (rel.filters && Object.keys(rel.filters).length) {
                    const filterParts = [];
                    for (const [field, value] of Object.entries(rel.filters)) {
                        const paramKey = `rel${i}_${field}`;
                        params[paramKey] = value;
                        filterParts.push(`r${i}.\`${field}\` = $${paramKey}`);
                    }
                    relMatch += ` { ${filterParts.join(', ')} }`;
                }
                relMatch += `]-${rel.direction === '<-' ? '-' : '>'} (${targetAlias}:\`${targetLabel}\``;
                if (rel.targetEntity.filterFields && Object.keys(rel.targetEntity.filterFields).length) {
                    const filterParts = [];
                    for (const [field, value] of Object.entries(rel.targetEntity.filterFields)) {
                        const paramKey = `${targetAlias}_${field}`;
                        params[paramKey] = value;
                        filterParts.push(`${targetAlias}.\`${field}\` = $${paramKey}`);
                    }
                    relMatch += ` { ${filterParts.join(', ')} }`;
                }
                relMatch += ')';
                clauses.push(relMatch);
            }
        }
        return clauses;
    }
    buildWhereClauses(config, params) {
        const clauses = [];
        if (config.tenantId && config.relationships && config.relationships.length) {
            for (let i = 0; i < config.relationships.length; i++) {
                params[`tenant_id_${i}`] = config.tenantId;
                clauses.push(`r${i}.tenant_id = $tenant_id_${i}`);
            }
        }
        if (config.whereConditions && Object.keys(config.whereConditions).length) {
            for (const [key, value] of Object.entries(config.whereConditions)) {
                const paramKey = `where_${key}`;
                params[paramKey] = value;
                clauses.push(`${key} = $${paramKey}`);
            }
        }
        return clauses;
    }
    formatResult(record, returnFields) {
        const result = {};
        for (const field of returnFields) {
            if (field.includes(' AS ')) {
                const [_expr, alias] = field.split(' AS ');
                const value = record.get(alias.trim());
                result[alias.trim()] = value && value.properties ? this.neo4j.toPlainObject(value.properties) : value;
            }
            else {
                const value = record.get(field);
                result[field] = value && value.properties ? this.neo4j.toPlainObject(value.properties) : value;
            }
        }
        return result;
    }
    async getPersonsWorkingAtOrg(orgId, tenantId) {
        const personConfig = entity_config_1.ENTITY_CONFIGS.person;
        const orgConfig = entity_config_1.ENTITY_CONFIGS.organization;
        return this.execute({
            mainEntity: { config: personConfig, alias: 'p' },
            relationships: [
                {
                    type: 'WORKS_AT',
                    direction: '->',
                    targetEntity: { config: orgConfig, alias: 'o', filterFields: { org_id: orgId } },
                },
            ],
            returns: [
                'p',
                'labels(p) AS labels',
                'o.name AS orgName',
            ],
            tenantId,
            orderBy: 'p.last_name',
        });
    }
    async getPersonsEnrolledInOrg(orgId, tenantId) {
        const personConfig = entity_config_1.ENTITY_CONFIGS.person;
        const orgConfig = entity_config_1.ENTITY_CONFIGS.organization;
        return this.execute({
            mainEntity: { config: personConfig, alias: 'p' },
            relationships: [
                {
                    type: 'ENROLLED_IN',
                    direction: '->',
                    targetEntity: { config: orgConfig, alias: 'o', filterFields: { org_id: orgId } },
                },
            ],
            returns: [
                'p',
                'labels(p) AS labels',
                'o.name AS orgName',
            ],
            tenantId,
            orderBy: 'p.last_name',
        });
    }
    async getPersonsWithMultipleRoles(personId, tenantId) {
        const personConfig = entity_config_1.ENTITY_CONFIGS.person;
        const orgConfig = entity_config_1.ENTITY_CONFIGS.organization;
        return this.execute({
            mainEntity: { config: personConfig, alias: 'p', filterFields: { strong_id: personId } },
            relationships: [
                {
                    type: 'WORKS_AT',
                    direction: '->',
                    targetEntity: { config: orgConfig, alias: 'o_work' },
                },
                {
                    type: 'ENROLLED_IN',
                    direction: '->',
                    targetEntity: { config: orgConfig, alias: 'o_enroll' },
                },
            ],
            returns: [
                'p',
                'labels(p) AS labels',
                'o_work.name AS worksAt',
                'o_enroll.name AS enrolledAt',
            ],
            tenantId,
            distinct: true,
        });
    }
};
exports.GenericQueryService = GenericQueryService;
exports.GenericQueryService = GenericQueryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], GenericQueryService);
//# sourceMappingURL=generic-query.service.js.map
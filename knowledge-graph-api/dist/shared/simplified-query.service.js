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
exports.SimplifiedQueryService = void 0;
const common_1 = require("@nestjs/common");
const generic_query_service_1 = require("./generic-query.service");
const entity_config_1 = require("./entity-config");
let SimplifiedQueryService = class SimplifiedQueryService {
    constructor(genericQuery) {
        this.genericQuery = genericQuery;
    }
    async execute(config) {
        const fullConfig = this.simplifyToFull(config);
        return this.genericQuery.execute(fullConfig);
    }
    simplifyToFull(config) {
        const entityConfig = entity_config_1.ENTITY_CONFIGS[config.entity];
        if (!entityConfig) {
            throw new common_1.BadRequestException(`Unknown entity: ${config.entity}`);
        }
        const mainAlias = config.entity.charAt(0);
        const mainEntityRef = {
            config: entityConfig,
            alias: mainAlias,
            filterFields: {},
        };
        if (config.id) {
            mainEntityRef.filterFields[entityConfig.idField] = config.id;
        }
        if (config.where) {
            mainEntityRef.filterFields = { ...mainEntityRef.filterFields, ...config.where };
        }
        const relationships = [];
        if (config.relationships && config.relationships.length) {
            for (const rel of config.relationships) {
                const targetConfig = entity_config_1.ENTITY_CONFIGS[rel.target];
                if (!targetConfig) {
                    throw new common_1.BadRequestException(`Unknown target entity: ${rel.target}`);
                }
                const targetAlias = rel.target.charAt(0);
                relationships.push({
                    type: rel.type,
                    direction: rel.direction || '->',
                    targetEntity: {
                        config: targetConfig,
                        alias: targetAlias,
                        filterFields: rel.filters || {},
                    },
                    filters: rel.relationshipFilters || {},
                });
            }
        }
        let returns;
        if (config.returns) {
            returns = config.returns;
        }
        else {
            returns = [mainAlias, `labels(${mainAlias}) AS labels`];
            if (relationships.length) {
                for (const rel of relationships) {
                    const tAlias = rel.targetEntity.alias;
                    returns.push(`${tAlias}.name AS ${tAlias}Name`);
                }
            }
        }
        const orderBy = config.orderBy
            ? `${mainAlias}.${config.orderBy}`
            : `${mainAlias}.\`${entityConfig.idField}\``;
        return {
            mainEntity: mainEntityRef,
            relationships,
            returns,
            tenantId: config.tenantId,
            orderBy,
            limit: config.limit || 1000,
            distinct: relationships.length > 0,
        };
    }
    async getPersons(tenantId, limit = 1000) {
        return this.execute({
            entity: 'person',
            tenantId,
            limit,
        });
    }
    async getPersonsAtOrg(orgId, tenantId, limit = 1000) {
        return this.execute({
            entity: 'person',
            relationships: [
                {
                    type: 'WORKS_AT',
                    target: 'organization',
                    filters: { org_id: orgId },
                },
            ],
            tenantId,
            limit,
        });
    }
    async getPersonsEnrolledAt(orgId, tenantId, limit = 1000) {
        return this.execute({
            entity: 'person',
            relationships: [
                {
                    type: 'ENROLLED_IN',
                    target: 'organization',
                    filters: { org_id: orgId },
                },
            ],
            tenantId,
            limit,
        });
    }
    async getPersonsWithSkill(skillId, tenantId, limit = 1000) {
        return this.execute({
            entity: 'person',
            relationships: [
                {
                    type: 'HAS_SKILL',
                    target: 'skill',
                    filters: { skill_id: skillId },
                },
            ],
            tenantId,
            limit,
        });
    }
    async getPersonMultipleRelationships(personId, tenantId) {
        return this.execute({
            entity: 'person',
            id: personId,
            relationships: [
                { type: 'WORKS_AT', target: 'organization' },
                { type: 'ENROLLED_IN', target: 'organization' },
                { type: 'HAS_SKILL', target: 'skill' },
                { type: 'LIVES_IN', target: 'location' },
            ],
            tenantId,
        });
    }
};
exports.SimplifiedQueryService = SimplifiedQueryService;
exports.SimplifiedQueryService = SimplifiedQueryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [generic_query_service_1.GenericQueryService])
], SimplifiedQueryService);
//# sourceMappingURL=simplified-query.service.js.map
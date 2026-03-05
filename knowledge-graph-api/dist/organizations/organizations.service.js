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
exports.OrganizationsService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../neo4j/neo4j.service");
let OrganizationsService = class OrganizationsService {
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async upsert(dto) {
        const records = await this.neo4j.runQuery(`
      MERGE (o:Organization {org_id: $orgId})
      ON CREATE SET
        o.name                = $name,
        o.organization_type   = $orgType,
        o.industry            = $industry,
        o.registration_number = $regNum,
        o.website             = $website,
        o.phone               = $phone
      ON MATCH SET
        o.name                = $name,
        o.organization_type   = $orgType,
        o.industry            = $industry,
        o.registration_number = $regNum,
        o.website             = $website,
        o.phone               = $phone
      RETURN o`, {
            orgId: dto.orgId,
            name: dto.name,
            orgType: dto.organizationType ?? null,
            industry: dto.industry ?? null,
            regNum: dto.registrationNumber ?? null,
            website: dto.website ?? null,
            phone: dto.phone ?? null,
        });
        return this.neo4j.toPlainObject(records[0].get('o').properties);
    }
    async findAll() {
        const records = await this.neo4j.runQuery('MATCH (o:Organization) RETURN o ORDER BY o.name');
        return records.map(r => this.neo4j.toPlainObject(r.get('o').properties));
    }
    async findOne(orgId) {
        const records = await this.neo4j.runQuery('MATCH (o:Organization {org_id: $orgId}) RETURN o', { orgId });
        if (!records.length)
            throw new common_1.NotFoundException(`Organization ${orgId} not found`);
        return this.neo4j.toPlainObject(records[0].get('o').properties);
    }
    async remove(orgId) {
        const records = await this.neo4j.runQuery('MATCH (o:Organization {org_id: $orgId}) DETACH DELETE o RETURN count(o) AS deleted', { orgId });
        if (!records[0].get('deleted').toNumber())
            throw new common_1.NotFoundException(`Organization ${orgId} not found`);
        return { deleted: true, orgId };
    }
};
exports.OrganizationsService = OrganizationsService;
exports.OrganizationsService = OrganizationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], OrganizationsService);
//# sourceMappingURL=organizations.service.js.map
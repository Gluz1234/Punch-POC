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
exports.DepartmentsService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../neo4j/neo4j.service");
let DepartmentsService = class DepartmentsService {
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async upsert(dto) {
        const records = await this.neo4j.runQuery(`
      MERGE (d:Department {department_id: $deptId})
      ON CREATE SET
        d.name        = $name,
        d.org_id      = $orgId,
        d.code        = $code,
        d.description = $description,
        d.head_name   = $headName
      ON MATCH SET
        d.name        = $name,
        d.code        = $code,
        d.description = $description,
        d.head_name   = $headName
      RETURN d`, {
            deptId: dto.departmentId,
            name: dto.name,
            orgId: dto.orgId ?? null,
            code: dto.code ?? null,
            description: dto.description ?? null,
            headName: dto.headName ?? null,
        });
        return this.neo4j.toPlainObject(records[0].get('d').properties);
    }
    async findAll() {
        const records = await this.neo4j.runQuery('MATCH (d:Department) RETURN d ORDER BY d.name');
        return records.map(r => this.neo4j.toPlainObject(r.get('d').properties));
    }
    async findByOrg(orgId) {
        const records = await this.neo4j.runQuery('MATCH (d:Department {org_id: $orgId}) RETURN d ORDER BY d.name', { orgId });
        return records.map(r => this.neo4j.toPlainObject(r.get('d').properties));
    }
    async findOne(departmentId) {
        const records = await this.neo4j.runQuery('MATCH (d:Department {department_id: $departmentId}) RETURN d', { departmentId });
        if (!records.length)
            throw new common_1.NotFoundException(`Department ${departmentId} not found`);
        return this.neo4j.toPlainObject(records[0].get('d').properties);
    }
    async remove(departmentId) {
        const records = await this.neo4j.runQuery('MATCH (d:Department {department_id: $departmentId}) DETACH DELETE d RETURN count(d) AS deleted', { departmentId });
        if (!records[0].get('deleted').toNumber())
            throw new common_1.NotFoundException(`Department ${departmentId} not found`);
        return { deleted: true, departmentId };
    }
};
exports.DepartmentsService = DepartmentsService;
exports.DepartmentsService = DepartmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], DepartmentsService);
//# sourceMappingURL=departments.service.js.map
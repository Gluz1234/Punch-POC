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
exports.CoursesService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../neo4j/neo4j.service");
let CoursesService = class CoursesService {
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async upsert(dto) {
        const records = await this.neo4j.runQuery(`
      MERGE (c:Course {course_id: $courseId})
      ON CREATE SET
        c.name          = $name,
        c.org_id        = $orgId,
        c.code          = $code,
        c.description   = $description,
        c.credits       = $credits,
        c.level         = $level,
        c.academic_term = $term
      ON MATCH SET
        c.name          = $name,
        c.code          = $code,
        c.description   = $description,
        c.credits       = $credits,
        c.level         = $level,
        c.academic_term = $term
      RETURN c`, {
            courseId: dto.courseId,
            name: dto.name,
            orgId: dto.orgId ?? null,
            code: dto.code ?? null,
            description: dto.description ?? null,
            credits: dto.credits ?? null,
            level: dto.level ?? null,
            term: dto.academicTerm ?? null,
        });
        return this.neo4j.toPlainObject(records[0].get('c').properties);
    }
    async findAll() {
        const records = await this.neo4j.runQuery('MATCH (c:Course) RETURN c ORDER BY c.name');
        return records.map(r => this.neo4j.toPlainObject(r.get('c').properties));
    }
    async findByOrg(orgId) {
        const records = await this.neo4j.runQuery('MATCH (c:Course {org_id: $orgId}) RETURN c ORDER BY c.name', { orgId });
        return records.map(r => this.neo4j.toPlainObject(r.get('c').properties));
    }
    async findOne(courseId) {
        const records = await this.neo4j.runQuery('MATCH (c:Course {course_id: $courseId}) RETURN c', { courseId });
        if (!records.length)
            throw new common_1.NotFoundException(`Course ${courseId} not found`);
        return this.neo4j.toPlainObject(records[0].get('c').properties);
    }
    async remove(courseId) {
        const records = await this.neo4j.runQuery('MATCH (c:Course {course_id: $courseId}) DETACH DELETE c RETURN count(c) AS deleted', { courseId });
        if (!records[0].get('deleted').toNumber())
            throw new common_1.NotFoundException(`Course ${courseId} not found`);
        return { deleted: true, courseId };
    }
};
exports.CoursesService = CoursesService;
exports.CoursesService = CoursesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], CoursesService);
//# sourceMappingURL=courses.service.js.map
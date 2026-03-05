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
exports.EducationService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../neo4j/neo4j.service");
let EducationService = class EducationService {
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async upsert(dto) {
        const records = await this.neo4j.runQuery(`
      MERGE (e:Education {education_id: $educationId})
      ON CREATE SET
        e.title          = $title,
        e.education_type = $eduType,
        e.field_of_study = $field,
        e.start_date     = $startDate,
        e.end_date       = $endDate,
        e.grade          = $grade
      ON MATCH SET
        e.title          = $title,
        e.education_type = $eduType,
        e.field_of_study = $field,
        e.start_date     = $startDate,
        e.end_date       = $endDate,
        e.grade          = $grade
      RETURN e`, {
            educationId: dto.educationId,
            title: dto.title,
            eduType: dto.educationType ?? null,
            field: dto.fieldOfStudy ?? null,
            startDate: dto.startDate ?? null,
            endDate: dto.endDate ?? null,
            grade: dto.grade ?? null,
        });
        return this.neo4j.toPlainObject(records[0].get('e').properties);
    }
    async findAll() {
        const records = await this.neo4j.runQuery('MATCH (e:Education) RETURN e ORDER BY e.title');
        return records.map(r => this.neo4j.toPlainObject(r.get('e').properties));
    }
    async findOne(educationId) {
        const records = await this.neo4j.runQuery('MATCH (e:Education {education_id: $educationId}) RETURN e', { educationId });
        if (!records.length)
            throw new common_1.NotFoundException(`Education ${educationId} not found`);
        return this.neo4j.toPlainObject(records[0].get('e').properties);
    }
    async remove(educationId) {
        const records = await this.neo4j.runQuery('MATCH (e:Education {education_id: $educationId}) DETACH DELETE e RETURN count(e) AS deleted', { educationId });
        if (!records[0].get('deleted').toNumber())
            throw new common_1.NotFoundException(`Education ${educationId} not found`);
        return { deleted: true, educationId };
    }
};
exports.EducationService = EducationService;
exports.EducationService = EducationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], EducationService);
//# sourceMappingURL=education.service.js.map
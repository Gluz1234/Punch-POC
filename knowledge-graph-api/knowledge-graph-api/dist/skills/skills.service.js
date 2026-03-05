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
exports.SkillsService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../neo4j/neo4j.service");
let SkillsService = class SkillsService {
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async upsert(dto) {
        const records = await this.neo4j.runQuery(`
      MERGE (s:Skill {skill_id: $skillId})
      ON CREATE SET
        s.name        = $name,
        s.category    = $category,
        s.description = $description,
        s.level_scale = $levelScale
      ON MATCH SET
        s.name        = $name,
        s.category    = $category,
        s.description = $description,
        s.level_scale = $levelScale
      RETURN s`, {
            skillId: dto.skillId,
            name: dto.name,
            category: dto.category ?? null,
            description: dto.description ?? null,
            levelScale: dto.levelScale ?? null,
        });
        return this.neo4j.toPlainObject(records[0].get('s').properties);
    }
    async findAll() {
        const records = await this.neo4j.runQuery('MATCH (s:Skill) RETURN s ORDER BY s.name');
        return records.map(r => this.neo4j.toPlainObject(r.get('s').properties));
    }
    async findOne(skillId) {
        const records = await this.neo4j.runQuery('MATCH (s:Skill {skill_id: $skillId}) RETURN s', { skillId });
        if (!records.length)
            throw new common_1.NotFoundException(`Skill ${skillId} not found`);
        return this.neo4j.toPlainObject(records[0].get('s').properties);
    }
    async remove(skillId) {
        const records = await this.neo4j.runQuery('MATCH (s:Skill {skill_id: $skillId}) DETACH DELETE s RETURN count(s) AS deleted', { skillId });
        if (!records[0].get('deleted').toNumber())
            throw new common_1.NotFoundException(`Skill ${skillId} not found`);
        return { deleted: true, skillId };
    }
};
exports.SkillsService = SkillsService;
exports.SkillsService = SkillsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], SkillsService);
//# sourceMappingURL=skills.service.js.map
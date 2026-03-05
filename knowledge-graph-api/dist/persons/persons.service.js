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
exports.PersonsService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../neo4j/neo4j.service");
let PersonsService = class PersonsService {
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async upsert(dto) {
        const records = await this.neo4j.runQuery(`
      MERGE (p:Person {strong_id: $strongId})
      ON CREATE SET
        p.first_name  = $firstName,  p.last_name   = $lastName,
        p.email       = $email,      p.phone       = $phone,
        p.nationality = $nationality, p.status      = $status,
        p.birth_date  = $birthDate
      ON MATCH SET
        p.first_name  = $firstName,  p.last_name   = $lastName,
        p.email       = $email,      p.phone       = $phone,
        p.nationality = $nationality, p.status      = $status,
        p.birth_date  = $birthDate
      RETURN p`, {
            strongId: dto.strongId,
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email ?? null,
            phone: dto.phone ?? null,
            nationality: dto.nationality ?? null,
            status: dto.status ?? null,
            birthDate: dto.birthDate ?? null,
        });
        return this.neo4j.toPlainObject(records[0].get('p').properties);
    }
    async findAll() {
        const records = await this.neo4j.runQuery('MATCH (p:Person) RETURN p, labels(p) AS labels ORDER BY p.last_name');
        return records.map(r => ({
            ...this.neo4j.toPlainObject(r.get('p').properties),
            labels: r.get('labels'),
        }));
    }
    async findOne(strongId) {
        const records = await this.neo4j.runQuery('MATCH (p:Person {strong_id: $strongId}) RETURN p, labels(p) AS labels', { strongId });
        if (!records.length)
            throw new common_1.NotFoundException(`Person ${strongId} not found`);
        return {
            ...this.neo4j.toPlainObject(records[0].get('p').properties),
            labels: records[0].get('labels'),
        };
    }
    async remove(strongId) {
        const records = await this.neo4j.runQuery('MATCH (p:Person {strong_id: $strongId}) DETACH DELETE p RETURN count(p) AS deleted', { strongId });
        if (!records[0].get('deleted').toNumber())
            throw new common_1.NotFoundException(`Person ${strongId} not found`);
        return { deleted: true, strongId };
    }
};
exports.PersonsService = PersonsService;
exports.PersonsService = PersonsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], PersonsService);
//# sourceMappingURL=persons.service.js.map
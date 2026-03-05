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
exports.PromotionsService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../neo4j/neo4j.service");
let PromotionsService = class PromotionsService {
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async getLabels(strongId) {
        const records = await this.neo4j.runQuery('MATCH (p:Person {strong_id: $strongId}) RETURN labels(p) AS labels', { strongId });
        if (!records.length)
            throw new common_1.NotFoundException(`Person ${strongId} not found`);
        return { strongId, labels: records[0].get('labels') };
    }
    async promoteToStudent(strongId, dto) {
        const records = await this.neo4j.runQuery(`
      MATCH (p:Person {strong_id: $strongId})
      SET p:Student
      SET p.student_id        = $studentId,
          p.gpa               = $gpa,
          p.enrollment_year   = $enrollmentYear,
          p.enrollment_status = $enrollmentStatus,
          p.study_mode        = $studyMode
      RETURN p, labels(p) AS labels`, {
            strongId,
            studentId: dto.studentId ?? null,
            gpa: dto.gpa ?? null,
            enrollmentYear: dto.enrollmentYear ?? null,
            enrollmentStatus: dto.enrollmentStatus ?? null,
            studyMode: dto.studyMode ?? null,
        });
        if (!records.length)
            throw new common_1.NotFoundException(`Person ${strongId} not found`);
        return {
            ...this.neo4j.toPlainObject(records[0].get('p').properties),
            labels: records[0].get('labels'),
        };
    }
    async promoteToEmployee(strongId, dto) {
        const records = await this.neo4j.runQuery(`
      MATCH (p:Person {strong_id: $strongId})
      SET p:Employee
      SET p.employee_number = $employeeNumber,
          p.contract_type   = $contractType,
          p.salary_band     = $salaryBand,
          p.department      = $department,
          p.hire_date       = $hireDate
      RETURN p, labels(p) AS labels`, {
            strongId,
            employeeNumber: dto.employeeNumber ?? null,
            contractType: dto.contractType ?? null,
            salaryBand: dto.salaryBand ?? null,
            department: dto.department ?? null,
            hireDate: dto.hireDate ?? null,
        });
        if (!records.length)
            throw new common_1.NotFoundException(`Person ${strongId} not found`);
        return {
            ...this.neo4j.toPlainObject(records[0].get('p').properties),
            labels: records[0].get('labels'),
        };
    }
    async promoteToResident(strongId, dto) {
        const records = await this.neo4j.runQuery(`
      MATCH (p:Person {strong_id: $strongId})
      SET p:Resident
      SET p.resident_id       = $residentId,
          p.registration_date = $registrationDate,
          p.residency_type    = $residencyType,
          p.marital_status    = $maritalStatus
      RETURN p, labels(p) AS labels`, {
            strongId,
            residentId: dto.residentId ?? null,
            registrationDate: dto.registrationDate ?? null,
            residencyType: dto.residencyType ?? null,
            maritalStatus: dto.maritalStatus ?? null,
        });
        if (!records.length)
            throw new common_1.NotFoundException(`Person ${strongId} not found`);
        return {
            ...this.neo4j.toPlainObject(records[0].get('p').properties),
            labels: records[0].get('labels'),
        };
    }
    async promoteToResearcher(strongId, dto) {
        const records = await this.neo4j.runQuery(`
      MATCH (p:Person {strong_id: $strongId})
      SET p:Researcher
      SET p.orcid_id        = $orcidId,
          p.research_field  = $researchField,
          p.h_index         = $hIndex,
          p.researcher_type = $researcherType
      RETURN p, labels(p) AS labels`, {
            strongId,
            orcidId: dto.orcidId ?? null,
            researchField: dto.researchField ?? null,
            hIndex: dto.hIndex ?? null,
            researcherType: dto.researcherType ?? null,
        });
        if (!records.length)
            throw new common_1.NotFoundException(`Person ${strongId} not found`);
        return {
            ...this.neo4j.toPlainObject(records[0].get('p').properties),
            labels: records[0].get('labels'),
        };
    }
    async getStudents(tenantId) {
        const records = await this.neo4j.runQuery(`
      MATCH (p:Person:Student)-[:ENROLLED_IN {tenant_id: $tenantId}]->(o:Organization)
      RETURN DISTINCT p, labels(p) AS labels, o.name AS orgName
      ORDER BY p.last_name`, { tenantId });
        return records.map(r => ({
            ...this.neo4j.toPlainObject(r.get('p').properties),
            labels: r.get('labels'),
            enrolledAt: r.get('orgName'),
        }));
    }
    async getEmployees(tenantId) {
        const records = await this.neo4j.runQuery(`
      MATCH (p:Person:Employee)-[:WORKS_AT {tenant_id: $tenantId}]->(o:Organization)
      RETURN DISTINCT p, labels(p) AS labels, o.name AS orgName
      ORDER BY p.last_name`, { tenantId });
        return records.map(r => ({
            ...this.neo4j.toPlainObject(r.get('p').properties),
            labels: r.get('labels'),
            worksAt: r.get('orgName'),
        }));
    }
    async getResearchers() {
        const records = await this.neo4j.runQuery('MATCH (p:Person:Researcher) RETURN p, labels(p) AS labels ORDER BY p.last_name');
        return records.map(r => ({
            ...this.neo4j.toPlainObject(r.get('p').properties),
            labels: r.get('labels'),
        }));
    }
    async getResidents(tenantId) {
        const records = await this.neo4j.runQuery(`
      MATCH (p:Person:Resident)-[:LIVES_IN {tenant_id: $tenantId}]->(l:Location)
      RETURN DISTINCT p, labels(p) AS labels, l.name AS locationName
      ORDER BY p.last_name`, { tenantId });
        return records.map(r => ({
            ...this.neo4j.toPlainObject(r.get('p').properties),
            labels: r.get('labels'),
            location: r.get('locationName'),
        }));
    }
};
exports.PromotionsService = PromotionsService;
exports.PromotionsService = PromotionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], PromotionsService);
//# sourceMappingURL=promotions.service.js.map
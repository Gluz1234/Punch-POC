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
exports.QueryService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../neo4j/neo4j.service");
let QueryService = class QueryService {
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async getPersonsEnrolledInOrg(orgId, tenantId) {
        const records = await this.neo4j.runQuery(`
      MATCH (p:Person)-[r:ENROLLED_IN {tenant_id: $tenantId}]->(o:Organization {org_id: $orgId})
      RETURN p, labels(p) AS labels, r.program AS program, r.start_date AS startDate
      ORDER BY p.last_name`, { orgId, tenantId });
        return records.map(r => ({
            person: { ...this.neo4j.toPlainObject(r.get('p').properties), labels: r.get('labels') },
            program: r.get('program'),
            startDate: r.get('startDate'),
        }));
    }
    async getPersonsWorkingAtOrg(orgId, tenantId) {
        const records = await this.neo4j.runQuery(`
      MATCH (p:Person)-[r:WORKS_AT {tenant_id: $tenantId}]->(o:Organization {org_id: $orgId})
      RETURN p, labels(p) AS labels, r.job_title AS jobTitle, r.start_date AS startDate
      ORDER BY p.last_name`, { orgId, tenantId });
        return records.map(r => ({
            person: { ...this.neo4j.toPlainObject(r.get('p').properties), labels: r.get('labels') },
            jobTitle: r.get('jobTitle'),
            startDate: r.get('startDate'),
        }));
    }
    async getPersonsLivingInLocation(locationId, tenantId) {
        const tenantFilter = tenantId ? '{tenant_id: $tenantId}' : '';
        const records = await this.neo4j.runQuery(`
      MATCH (p:Person)-[r:LIVES_IN ${tenantFilter}]->(l:Location {location_id: $locationId})
      RETURN p, labels(p) AS labels, r.tenant_id AS tenant, r.residence_type AS residenceType
      ORDER BY p.last_name`, { locationId, tenantId: tenantId ?? null });
        return records.map(r => ({
            person: { ...this.neo4j.toPlainObject(r.get('p').properties), labels: r.get('labels') },
            tenantId: r.get('tenant'),
            residenceType: r.get('residenceType'),
        }));
    }
    async getPersonsRegisteredAtLocation(locationId, tenantId) {
        const records = await this.neo4j.runQuery(`
      MATCH (p:Person:Resident)-[r:REGISTERED_AT {tenant_id: $tenantId}]->(l:Location {location_id: $locationId})
      RETURN p, labels(p) AS labels, r.since AS since, r.address_type AS addressType
      ORDER BY p.last_name`, { locationId, tenantId });
        return records.map(r => ({
            person: { ...this.neo4j.toPlainObject(r.get('p').properties), labels: r.get('labels') },
            since: r.get('since'),
            addressType: r.get('addressType'),
        }));
    }
    async getPersonsEnrolledAndWorking(orgA, tenantA, orgB, tenantB) {
        const records = await this.neo4j.runQuery(`
      MATCH (p:Person)-[r1:ENROLLED_IN {tenant_id: $tenantA}]->(a:Organization {org_id: $orgA})
      MATCH (p)       -[r2:WORKS_AT    {tenant_id: $tenantB}]->(b:Organization {org_id: $orgB})
      RETURN p, labels(p) AS labels,
             r1.program   AS program,  a.name AS orgAName,
             r2.job_title AS jobTitle, b.name AS orgBName
      ORDER BY p.last_name`, { orgA, tenantA, orgB, tenantB });
        return records.map(r => ({
            person: { ...this.neo4j.toPlainObject(r.get('p').properties), labels: r.get('labels') },
            enrolled: { org: r.get('orgAName'), program: r.get('program'), tenant: tenantA },
            worksAt: { org: r.get('orgBName'), title: r.get('jobTitle'), tenant: tenantB },
        }));
    }
    async getPersonsWithMultipleEmployers(tenantA, tenantB) {
        const records = await this.neo4j.runQuery(`
      MATCH (p:Person)-[r1:WORKS_AT {tenant_id: $tenantA}]->(a:Organization)
      MATCH (p)       -[r2:WORKS_AT {tenant_id: $tenantB}]->(b:Organization)
      WHERE a.org_id <> b.org_id
      RETURN p, labels(p) AS labels,
             r1.job_title AS titleA, a.name AS orgAName,
             r2.job_title AS titleB, b.name AS orgBName
      ORDER BY p.last_name`, { tenantA, tenantB });
        return records.map(r => ({
            person: { ...this.neo4j.toPlainObject(r.get('p').properties), labels: r.get('labels') },
            jobA: { org: r.get('orgAName'), title: r.get('titleA'), tenant: tenantA },
            jobB: { org: r.get('orgBName'), title: r.get('titleB'), tenant: tenantB },
        }));
    }
    async getPersonsWithSkill(skillId) {
        const records = await this.neo4j.runQuery(`
      MATCH (p:Person)-[r:HAS_SKILL]->(s:Skill {skill_id: $skillId})
      RETURN p, labels(p) AS labels, r.tenant_id AS tenant, r.proficiency_level AS level
      ORDER BY p.last_name`, { skillId });
        return records.map(r => ({
            person: { ...this.neo4j.toPlainObject(r.get('p').properties), labels: r.get('labels') },
            tenantId: r.get('tenant'),
            level: r.get('level'),
        }));
    }
    async getTenantsForPerson(strongId) {
        const records = await this.neo4j.runQuery(`
      MATCH (p:Person {strong_id: $strongId})-[r]->()
      WHERE r.tenant_id IS NOT NULL
      RETURN DISTINCT r.tenant_id AS tenant ORDER BY tenant`, { strongId });
        return records.map(r => r.get('tenant'));
    }
    async getOrgChart(orgId, tenantId) {
        const records = await this.neo4j.runQuery(`
      MATCH (e:Person:Employee)-[r:WORKS_AT {tenant_id: $tenantId}]->(o:Organization {org_id: $orgId})
      OPTIONAL MATCH (e)-[mgr:REPORTS_TO {tenant_id: $tenantId}]->(m:Person)
      RETURN e, labels(e) AS labels, r.job_title AS jobTitle,
             m.strong_id AS managerId,
             m.first_name + ' ' + m.last_name AS managerName
      ORDER BY e.last_name`, { orgId, tenantId });
        return records.map(r => ({
            employee: { ...this.neo4j.toPlainObject(r.get('e').properties), labels: r.get('labels') },
            jobTitle: r.get('jobTitle'),
            reportsTo: r.get('managerId')
                ? { strongId: r.get('managerId'), name: r.get('managerName') }
                : null,
        }));
    }
    async getCourseRegistrations(courseId, tenantId) {
        const records = await this.neo4j.runQuery(`
      MATCH (p:Person:Student)-[r:REGISTERED_FOR {tenant_id: $tenantId}]->(c:Course {course_id: $courseId})
      RETURN p, labels(p) AS labels, r.grade AS grade, r.status AS status, r.academic_term AS term
      ORDER BY p.last_name`, { courseId, tenantId });
        return records.map(r => ({
            student: { ...this.neo4j.toPlainObject(r.get('p').properties), labels: r.get('labels') },
            grade: r.get('grade'),
            status: r.get('status'),
            term: r.get('term'),
        }));
    }
    async getPersonsByLabel(label, tenantId) {
        const safeLabel = this.neo4j.sanitizeIdentifier(label);
        let records;
        if (tenantId) {
            records = await this.neo4j.runQuery(`MATCH (p:Person:\`${safeLabel}\`)-[r]->()
         WHERE r.tenant_id = $tenantId
         RETURN DISTINCT p, labels(p) AS labels ORDER BY p.last_name`, { tenantId });
        }
        else {
            records = await this.neo4j.runQuery(`MATCH (p:Person:\`${safeLabel}\`) RETURN p, labels(p) AS labels ORDER BY p.last_name`);
        }
        return records.map(r => ({
            ...this.neo4j.toPlainObject(r.get('p').properties),
            labels: r.get('labels'),
        }));
    }
};
exports.QueryService = QueryService;
exports.QueryService = QueryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], QueryService);
//# sourceMappingURL=query.service.js.map
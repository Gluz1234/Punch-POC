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
exports.RelationshipsService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../neo4j/neo4j.service");
let RelationshipsService = class RelationshipsService {
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async getPersonRelationships(strongId, tenantId) {
        const filter = tenantId ? 'WHERE r.tenant_id = $tenantId' : '';
        const records = await this.neo4j.runQuery(`
      MATCH (p:Person {strong_id: $strongId})-[r]->(n)
      ${filter}
      RETURN type(r)       AS relType,
             r.tenant_id   AS tenant,
             labels(n)     AS targetLabels,
             properties(r) AS relProps,
             COALESCE(n.name, n.org_id, n.skill_id, n.location_id,
                      n.education_id, n.course_id, n.department_id,
                      n.strong_id, n.id) AS targetId`, { strongId, tenantId: tenantId ?? null });
        return records.map(r => ({
            type: r.get('relType'),
            tenantId: r.get('tenant'),
            targetLabels: r.get('targetLabels'),
            targetId: r.get('targetId'),
            properties: this.neo4j.toPlainObject(r.get('relProps')),
        }));
    }
    async createEnrolledIn(dto) {
        await this.neo4j.runQuery(`
      MATCH (p:Person       {strong_id: $personId})
      MATCH (o:Organization {org_id:    $orgId})
      MERGE (p)-[r:ENROLLED_IN {tenant_id: $tenantId, org_id: $orgId}]->(o)
      ON CREATE SET r.created_at = $now, r.start_date = $startDate, r.program = $program`, { personId: dto.personStrongId, orgId: dto.orgId, tenantId: dto.tenantId,
            now: new Date().toISOString(), startDate: dto.startDate ?? null, program: dto.program ?? null });
        return { created: true, type: 'ENROLLED_IN', ...dto };
    }
    async deleteEnrolledIn(personId, orgId, tenantId) {
        await this.neo4j.runQuery(`
      MATCH (p:Person {strong_id: $personId})
            -[r:ENROLLED_IN {tenant_id: $tenantId, org_id: $orgId}]->()
      DELETE r`, { personId, orgId, tenantId });
        return { deleted: true };
    }
    async createWorksAt(dto) {
        await this.neo4j.runQuery(`
      MATCH (p:Person       {strong_id: $personId})
      MATCH (o:Organization {org_id:    $orgId})
      MERGE (p)-[r:WORKS_AT {tenant_id: $tenantId, org_id: $orgId}]->(o)
      ON CREATE SET r.created_at = $now, r.job_title = $jobTitle, r.start_date = $startDate`, { personId: dto.personStrongId, orgId: dto.orgId, tenantId: dto.tenantId,
            now: new Date().toISOString(), jobTitle: dto.jobTitle ?? null, startDate: dto.startDate ?? null });
        return { created: true, type: 'WORKS_AT', ...dto };
    }
    async deleteWorksAt(personId, orgId, tenantId) {
        await this.neo4j.runQuery(`
      MATCH (p:Person {strong_id: $personId})
            -[r:WORKS_AT {tenant_id: $tenantId, org_id: $orgId}]->()
      DELETE r`, { personId, orgId, tenantId });
        return { deleted: true };
    }
    async createLivesIn(dto) {
        await this.neo4j.runQuery(`
      MATCH (p:Person   {strong_id:   $personId})
      MATCH (l:Location {location_id: $locationId})
      MERGE (p)-[r:LIVES_IN {tenant_id: $tenantId, location_id: $locationId}]->(l)
      ON CREATE SET r.created_at = $now, r.residence_type = $residenceType`, { personId: dto.personStrongId, locationId: dto.locationId, tenantId: dto.tenantId,
            now: new Date().toISOString(), residenceType: dto.residenceType ?? null });
        return { created: true, type: 'LIVES_IN', ...dto };
    }
    async deleteLivesIn(personId, locationId, tenantId) {
        await this.neo4j.runQuery(`
      MATCH (p:Person {strong_id: $personId})
            -[r:LIVES_IN {tenant_id: $tenantId, location_id: $locationId}]->()
      DELETE r`, { personId, locationId, tenantId });
        return { deleted: true };
    }
    async createHasSkill(dto) {
        await this.neo4j.runQuery(`
      MATCH (p:Person {strong_id: $personId})
      MATCH (s:Skill  {skill_id:  $skillId})
      MERGE (p)-[r:HAS_SKILL {tenant_id: $tenantId, skill_id: $skillId}]->(s)
      ON CREATE SET r.created_at = $now, r.proficiency_level = $level`, { personId: dto.personStrongId, skillId: dto.skillId, tenantId: dto.tenantId,
            now: new Date().toISOString(), level: dto.proficiencyLevel ?? null });
        return { created: true, type: 'HAS_SKILL', ...dto };
    }
    async deleteHasSkill(personId, skillId, tenantId) {
        await this.neo4j.runQuery(`
      MATCH (p:Person {strong_id: $personId})
            -[r:HAS_SKILL {tenant_id: $tenantId, skill_id: $skillId}]->()
      DELETE r`, { personId, skillId, tenantId });
        return { deleted: true };
    }
    async createCompleted(dto) {
        await this.neo4j.runQuery(`
      MATCH (p:Person    {strong_id:    $personId})
      MATCH (e:Education {education_id: $educationId})
      MERGE (p)-[r:COMPLETED {tenant_id: $tenantId, education_id: $educationId}]->(e)
      ON CREATE SET r.created_at = $now`, { personId: dto.personStrongId, educationId: dto.educationId,
            tenantId: dto.tenantId, now: new Date().toISOString() });
        return { created: true, type: 'COMPLETED', ...dto };
    }
    async createProvidedBy(dto) {
        await this.neo4j.runQuery(`
      MATCH (e:Education    {education_id: $educationId})
      MATCH (o:Organization {org_id:       $orgId})
      MERGE (e)-[r:PROVIDED_BY {tenant_id: $tenantId}]->(o)
      ON CREATE SET r.created_at = $now`, { educationId: dto.educationId, orgId: dto.orgId,
            tenantId: dto.tenantId, now: new Date().toISOString() });
        return { created: true, type: 'PROVIDED_BY', ...dto };
    }
    async createRequiresSkill(dto) {
        await this.neo4j.runQuery(`
      MATCH (o:Organization {org_id:   $orgId})
      MATCH (s:Skill        {skill_id: $skillId})
      MERGE (o)-[r:REQUIRES_SKILL {tenant_id: $tenantId, skill_id: $skillId}]->(s)
      ON CREATE SET r.created_at = $now, r.requirement_level = $reqLevel`, { orgId: dto.orgId, skillId: dto.skillId, tenantId: dto.tenantId,
            now: new Date().toISOString(), reqLevel: dto.requirementLevel ?? null });
        return { created: true, type: 'REQUIRES_SKILL', ...dto };
    }
    async createHasAdvisor(dto) {
        await this.neo4j.runQuery(`
      MATCH (s:Person {strong_id: $studentId})
      MATCH (a:Person {strong_id: $advisorId})
      MERGE (s)-[r:HAS_ADVISOR {tenant_id: $tenantId, advisor_id: $advisorId}]->(a)
      ON CREATE SET r.created_at = $now, r.advisor_role = $advisorRole`, { studentId: dto.studentStrongId, advisorId: dto.advisorStrongId,
            tenantId: dto.tenantId, now: new Date().toISOString(),
            advisorRole: dto.advisorRole ?? null });
        return { created: true, type: 'HAS_ADVISOR', ...dto };
    }
    async createRegisteredFor(dto) {
        await this.neo4j.runQuery(`
      MATCH (s:Person {strong_id: $studentId})
      MATCH (c:Course {course_id:  $courseId})
      MERGE (s)-[r:REGISTERED_FOR {tenant_id: $tenantId, course_id: $courseId}]->(c)
      ON CREATE SET r.created_at = $now, r.grade = $grade,
                    r.status = $status, r.academic_term = $term`, { studentId: dto.studentStrongId, courseId: dto.courseId,
            tenantId: dto.tenantId, now: new Date().toISOString(),
            grade: dto.grade ?? null, status: dto.status ?? null, term: dto.academicTerm ?? null });
        return { created: true, type: 'REGISTERED_FOR', ...dto };
    }
    async createReportsTo(dto) {
        await this.neo4j.runQuery(`
      MATCH (e:Person {strong_id: $employeeId})
      MATCH (m:Person {strong_id: $managerId})
      MERGE (e)-[r:REPORTS_TO {tenant_id: $tenantId}]->(m)
      ON CREATE SET r.created_at = $now, r.reporting_type = $reportingType`, { employeeId: dto.employeeStrongId, managerId: dto.managerStrongId,
            tenantId: dto.tenantId, now: new Date().toISOString(),
            reportingType: dto.reportingType ?? null });
        return { created: true, type: 'REPORTS_TO', ...dto };
    }
    async createWorksIn(dto) {
        await this.neo4j.runQuery(`
      MATCH (e:Person     {strong_id:     $employeeId})
      MATCH (d:Department {department_id: $deptId})
      MERGE (e)-[r:WORKS_IN {tenant_id: $tenantId, department_id: $deptId}]->(d)
      ON CREATE SET r.created_at = $now, r.role = $role, r.start_date = $startDate`, { employeeId: dto.employeeStrongId, deptId: dto.departmentId,
            tenantId: dto.tenantId, now: new Date().toISOString(),
            role: dto.role ?? null, startDate: dto.startDate ?? null });
        return { created: true, type: 'WORKS_IN', ...dto };
    }
    async createRegisteredAt(dto) {
        await this.neo4j.runQuery(`
      MATCH (r:Person   {strong_id:   $residentId})
      MATCH (l:Location {location_id: $locationId})
      MERGE (r)-[rel:REGISTERED_AT {tenant_id: $tenantId, location_id: $locationId}]->(l)
      ON CREATE SET rel.created_at = $now, rel.since = $since, rel.address_type = $addressType`, { residentId: dto.residentStrongId, locationId: dto.locationId,
            tenantId: dto.tenantId, now: new Date().toISOString(),
            since: dto.since ?? null, addressType: dto.addressType ?? null });
        return { created: true, type: 'REGISTERED_AT', ...dto };
    }
    async createAffiliatedWith(dto) {
        await this.neo4j.runQuery(`
      MATCH (r:Person       {strong_id: $researcherId})
      MATCH (o:Organization {org_id:    $orgId})
      MERGE (r)-[rel:AFFILIATED_WITH {tenant_id: $tenantId, org_id: $orgId}]->(o)
      ON CREATE SET rel.created_at = $now, rel.affiliation_type = $affiliationType`, { researcherId: dto.researcherStrongId, orgId: dto.orgId,
            tenantId: dto.tenantId, now: new Date().toISOString(),
            affiliationType: dto.affiliationType ?? null });
        return { created: true, type: 'AFFILIATED_WITH', ...dto };
    }
    async createOfferedBy(dto) {
        await this.neo4j.runQuery(`
      MATCH (c:Course       {course_id: $courseId})
      MATCH (o:Organization {org_id:    $orgId})
      MERGE (c)-[r:OFFERED_BY {tenant_id: $tenantId}]->(o)
      ON CREATE SET r.created_at = $now`, { courseId: dto.courseId, orgId: dto.orgId,
            tenantId: dto.tenantId, now: new Date().toISOString() });
        return { created: true, type: 'OFFERED_BY', ...dto };
    }
    async createBelongsTo(dto) {
        await this.neo4j.runQuery(`
      MATCH (d:Department   {department_id: $deptId})
      MATCH (o:Organization {org_id:        $orgId})
      MERGE (d)-[r:BELONGS_TO {tenant_id: $tenantId}]->(o)
      ON CREATE SET r.created_at = $now`, { deptId: dto.departmentId, orgId: dto.orgId,
            tenantId: dto.tenantId, now: new Date().toISOString() });
        return { created: true, type: 'BELONGS_TO', ...dto };
    }
};
exports.RelationshipsService = RelationshipsService;
exports.RelationshipsService = RelationshipsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], RelationshipsService);
//# sourceMappingURL=relationships.service.js.map
import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class QueryService {
  constructor(private readonly neo4j: Neo4jService) {}

  // ── Tenant-scoped ──────────────────────────────────────────────────────────

  async getPersonsEnrolledInOrg(orgId: string, tenantId: string) {
    const records = await this.neo4j.runQuery(`
      MATCH (p:Person)-[r:ENROLLED_IN {tenant_id: $tenantId}]->(o:Organization {org_id: $orgId})
      RETURN p, labels(p) AS labels, r.program AS program, r.start_date AS startDate
      ORDER BY p.last_name`,
      { orgId, tenantId });
    return records.map(r => ({
      person:    { ...this.neo4j.toPlainObject(r.get('p').properties), labels: r.get('labels') },
      program:   r.get('program'),
      startDate: r.get('startDate'),
    }));
  }

  async getPersonsWorkingAtOrg(orgId: string, tenantId: string) {
    const records = await this.neo4j.runQuery(`
      MATCH (p:Person)-[r:WORKS_AT {tenant_id: $tenantId}]->(o:Organization {org_id: $orgId})
      RETURN p, labels(p) AS labels, r.job_title AS jobTitle, r.start_date AS startDate
      ORDER BY p.last_name`,
      { orgId, tenantId });
    return records.map(r => ({
      person:    { ...this.neo4j.toPlainObject(r.get('p').properties), labels: r.get('labels') },
      jobTitle:  r.get('jobTitle'),
      startDate: r.get('startDate'),
    }));
  }

  async getPersonsLivingInLocation(locationId: string, tenantId?: string) {
    const tenantFilter = tenantId ? '{tenant_id: $tenantId}' : '';
    const records      = await this.neo4j.runQuery(`
      MATCH (p:Person)-[r:LIVES_IN ${tenantFilter}]->(l:Location {location_id: $locationId})
      RETURN p, labels(p) AS labels, r.tenant_id AS tenant, r.residence_type AS residenceType
      ORDER BY p.last_name`,
      { locationId, tenantId: tenantId ?? null });
    return records.map(r => ({
      person:        { ...this.neo4j.toPlainObject(r.get('p').properties), labels: r.get('labels') },
      tenantId:      r.get('tenant'),
      residenceType: r.get('residenceType'),
    }));
  }

  async getPersonsRegisteredAtLocation(locationId: string, tenantId: string) {
    const records = await this.neo4j.runQuery(`
      MATCH (p:Person:Resident)-[r:REGISTERED_AT {tenant_id: $tenantId}]->(l:Location {location_id: $locationId})
      RETURN p, labels(p) AS labels, r.since AS since, r.address_type AS addressType
      ORDER BY p.last_name`,
      { locationId, tenantId });
    return records.map(r => ({
      person:      { ...this.neo4j.toPlainObject(r.get('p').properties), labels: r.get('labels') },
      since:       r.get('since'),
      addressType: r.get('addressType'),
    }));
  }

  // ── Cross-tenant ───────────────────────────────────────────────────────────

  async getPersonsEnrolledAndWorking(orgA: string, tenantA: string, orgB: string, tenantB: string) {
    const records = await this.neo4j.runQuery(`
      MATCH (p:Person)-[r1:ENROLLED_IN {tenant_id: $tenantA}]->(a:Organization {org_id: $orgA})
      MATCH (p)       -[r2:WORKS_AT    {tenant_id: $tenantB}]->(b:Organization {org_id: $orgB})
      RETURN p, labels(p) AS labels,
             r1.program   AS program,  a.name AS orgAName,
             r2.job_title AS jobTitle, b.name AS orgBName
      ORDER BY p.last_name`,
      { orgA, tenantA, orgB, tenantB });
    return records.map(r => ({
      person:   { ...this.neo4j.toPlainObject(r.get('p').properties), labels: r.get('labels') },
      enrolled: { org: r.get('orgAName'), program: r.get('program'),  tenant: tenantA },
      worksAt:  { org: r.get('orgBName'), title:   r.get('jobTitle'), tenant: tenantB },
    }));
  }

  async getPersonsWithMultipleEmployers(tenantA: string, tenantB: string) {
    const records = await this.neo4j.runQuery(`
      MATCH (p:Person)-[r1:WORKS_AT {tenant_id: $tenantA}]->(a:Organization)
      MATCH (p)       -[r2:WORKS_AT {tenant_id: $tenantB}]->(b:Organization)
      WHERE a.org_id <> b.org_id
      RETURN p, labels(p) AS labels,
             r1.job_title AS titleA, a.name AS orgAName,
             r2.job_title AS titleB, b.name AS orgBName
      ORDER BY p.last_name`,
      { tenantA, tenantB });
    return records.map(r => ({
      person: { ...this.neo4j.toPlainObject(r.get('p').properties), labels: r.get('labels') },
      jobA:   { org: r.get('orgAName'), title: r.get('titleA'), tenant: tenantA },
      jobB:   { org: r.get('orgBName'), title: r.get('titleB'), tenant: tenantB },
    }));
  }

  // ── Global ─────────────────────────────────────────────────────────────────

  async getPersonsWithSkill(skillId: string) {
    const records = await this.neo4j.runQuery(`
      MATCH (p:Person)-[r:HAS_SKILL]->(s:Skill {skill_id: $skillId})
      RETURN p, labels(p) AS labels, r.tenant_id AS tenant, r.proficiency_level AS level
      ORDER BY p.last_name`,
      { skillId });
    return records.map(r => ({
      person:   { ...this.neo4j.toPlainObject(r.get('p').properties), labels: r.get('labels') },
      tenantId: r.get('tenant'),
      level:    r.get('level'),
    }));
  }

  async getTenantsForPerson(strongId: string) {
    const records = await this.neo4j.runQuery(`
      MATCH (p:Person {strong_id: $strongId})-[r]->()
      WHERE r.tenant_id IS NOT NULL
      RETURN DISTINCT r.tenant_id AS tenant ORDER BY tenant`,
      { strongId });
    return records.map(r => r.get('tenant'));
  }

  async getOrgChart(orgId: string, tenantId: string) {
    const records = await this.neo4j.runQuery(`
      MATCH (e:Person:Employee)-[r:WORKS_AT {tenant_id: $tenantId}]->(o:Organization {org_id: $orgId})
      OPTIONAL MATCH (e)-[mgr:REPORTS_TO {tenant_id: $tenantId}]->(m:Person)
      RETURN e, labels(e) AS labels, r.job_title AS jobTitle,
             m.strong_id AS managerId,
             m.first_name + ' ' + m.last_name AS managerName
      ORDER BY e.last_name`,
      { orgId, tenantId });
    return records.map(r => ({
      employee:  { ...this.neo4j.toPlainObject(r.get('e').properties), labels: r.get('labels') },
      jobTitle:  r.get('jobTitle'),
      reportsTo: r.get('managerId')
        ? { strongId: r.get('managerId'), name: r.get('managerName') }
        : null,
    }));
  }

  async getCourseRegistrations(courseId: string, tenantId: string) {
    const records = await this.neo4j.runQuery(`
      MATCH (p:Person:Student)-[r:REGISTERED_FOR {tenant_id: $tenantId}]->(c:Course {course_id: $courseId})
      RETURN p, labels(p) AS labels, r.grade AS grade, r.status AS status, r.academic_term AS term
      ORDER BY p.last_name`,
      { courseId, tenantId });
    return records.map(r => ({
      student: { ...this.neo4j.toPlainObject(r.get('p').properties), labels: r.get('labels') },
      grade:   r.get('grade'),
      status:  r.get('status'),
      term:    r.get('term'),
    }));
  }

  async getPersonsByLabel(label: string, tenantId?: string) {
    const safeLabel = this.neo4j.sanitizeIdentifier(label);
    let records: any[];

    if (tenantId) {
      records = await this.neo4j.runQuery(
        `MATCH (p:Person:\`${safeLabel}\`)-[r]->()
         WHERE r.tenant_id = $tenantId
         RETURN DISTINCT p, labels(p) AS labels ORDER BY p.last_name`,
        { tenantId },
      );
    } else {
      records = await this.neo4j.runQuery(
        `MATCH (p:Person:\`${safeLabel}\`) RETURN p, labels(p) AS labels ORDER BY p.last_name`,
      );
    }
    return records.map(r => ({
      ...this.neo4j.toPlainObject(r.get('p').properties),
      labels: r.get('labels'),
    }));
  }
}

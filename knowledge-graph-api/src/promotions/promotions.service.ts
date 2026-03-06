import { Injectable, NotFoundException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class PromotionsService {
  constructor(private readonly neo4j: Neo4jService) {}

  // ── Read current labels on a person ──────────────────────────────────────

  async getLabels(strongId: string) {
    const records = await this.neo4j.runQuery(
      'MATCH (p:Person {strong_id: $strongId}) RETURN labels(p) AS labels',
      { strongId },
    );
    if (!records.length) throw new NotFoundException(`Person ${strongId} not found`);
    return { strongId, labels: records[0].get('labels') };
  }

  // ── Promote to :Student ───────────────────────────────────────────────────

  async promoteToStudent(strongId: string, dto: any) {
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
      studentId:        dto.studentId        ?? null,
      gpa:              dto.gpa              ?? null,
      enrollmentYear:   dto.enrollmentYear   ?? null,
      enrollmentStatus: dto.enrollmentStatus ?? null,
      studyMode:        dto.studyMode        ?? null,
    });
    if (!records.length) throw new NotFoundException(`Person ${strongId} not found`);
    return {
      ...this.neo4j.toPlainObject(records[0].get('p').properties),
      labels: records[0].get('labels'),
    };
  }

  // ── Promote to :Employee ──────────────────────────────────────────────────

  async promoteToEmployee(strongId: string, dto: any) {
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
      contractType:   dto.contractType   ?? null,
      salaryBand:     dto.salaryBand     ?? null,
      department:     dto.department     ?? null,
      hireDate:       dto.hireDate       ?? null,
    });
    if (!records.length) throw new NotFoundException(`Person ${strongId} not found`);
    return {
      ...this.neo4j.toPlainObject(records[0].get('p').properties),
      labels: records[0].get('labels'),
    };
  }

  // ── Promote to :Resident ──────────────────────────────────────────────────

  async promoteToResident(strongId: string, dto: any) {
    const records = await this.neo4j.runQuery(`
      MATCH (p:Person {strong_id: $strongId})
      SET p:Resident
      SET p.resident_id       = $residentId,
          p.registration_date = $registrationDate,
          p.residency_type    = $residencyType,
          p.marital_status    = $maritalStatus
      RETURN p, labels(p) AS labels`, {
      strongId,
      residentId:       dto.residentId       ?? null,
      registrationDate: dto.registrationDate ?? null,
      residencyType:    dto.residencyType    ?? null,
      maritalStatus:    dto.maritalStatus    ?? null,
    });
    if (!records.length) throw new NotFoundException(`Person ${strongId} not found`);
    return {
      ...this.neo4j.toPlainObject(records[0].get('p').properties),
      labels: records[0].get('labels'),
    };
  }

  // ── Promote to :Researcher ────────────────────────────────────────────────

  async promoteToResearcher(strongId: string, dto: any) {
    const records = await this.neo4j.runQuery(`
      MATCH (p:Person {strong_id: $strongId})
      SET p:Researcher
      SET p.orcid_id        = $orcidId,
          p.research_field  = $researchField,
          p.h_index         = $hIndex,
          p.researcher_type = $researcherType
      RETURN p, labels(p) AS labels`, {
      strongId,
      orcidId:        dto.orcidId        ?? null,
      researchField:  dto.researchField  ?? null,
      hIndex:         dto.hIndex         ?? null,
      researcherType: dto.researcherType ?? null,
    });
    if (!records.length) throw new NotFoundException(`Person ${strongId} not found`);
    return {
      ...this.neo4j.toPlainObject(records[0].get('p').properties),
      labels: records[0].get('labels'),
    };
  }

  // ── Generic Subtype Promotion ───────────────────────────────────────────

  async promoteToSubtype(strongId: string, subtype: string, properties: Record<string, any>) {
    const safeSubtype = this.neo4j.sanitizeIdentifier(subtype);
    const safeProps = this.sanitizePropertyKeys(properties);

    // Build SET clauses dynamically
    const setParts = Object.keys(safeProps).map(k => `p.\`${k}\` = $prop_${k}`).join(', ');
    const setClause = setParts ? `SET ${setParts}` : '';

    const params: Record<string, any> = { strongId };
    for (const [k, v] of Object.entries(safeProps)) {
      params[`prop_${k}`] = v;
    }

    const records = await this.neo4j.runQuery(`
      MATCH (p:Person {strong_id: $strongId})
      SET p:\`${safeSubtype}\`
      ${setClause}
      RETURN p, labels(p) AS labels`,
      params
    );

    if (!records.length) throw new NotFoundException(`Person ${strongId} not found`);
    return {
      ...this.neo4j.toPlainObject(records[0].get('p').properties),
      labels: records[0].get('labels'),
    };
  }

  // Helper to sanitize property keys (similar to generic entity service)
  private sanitizePropertyKeys(dto: any): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(dto || {})) {
      if (v !== undefined && v !== null) {
        const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = v;
      }
    }
    return result;
  }

  // ── Subtype listing queries ───────────────────────────────────────────────

  async getStudents(tenantId: string) {
    const records = await this.neo4j.runQuery(`
      MATCH (p:Person:Student)-[:ENROLLED_IN {tenant_id: $tenantId}]->(o:Organization)
      RETURN DISTINCT p, labels(p) AS labels, o.name AS orgName
      ORDER BY p.last_name`,
      { tenantId });
    return records.map(r => ({
      ...this.neo4j.toPlainObject(r.get('p').properties),
      labels:     r.get('labels'),
      enrolledAt: r.get('orgName'),
    }));
  }

  async getEmployees(tenantId: string) {
    const records = await this.neo4j.runQuery(`
      MATCH (p:Person:Employee)-[:WORKS_AT {tenant_id: $tenantId}]->(o:Organization)
      RETURN DISTINCT p, labels(p) AS labels, o.name AS orgName
      ORDER BY p.last_name`,
      { tenantId });
    return records.map(r => ({
      ...this.neo4j.toPlainObject(r.get('p').properties),
      labels:  r.get('labels'),
      worksAt: r.get('orgName'),
    }));
  }

  async getResearchers() {
    const records = await this.neo4j.runQuery(
      'MATCH (p:Person:Researcher) RETURN p, labels(p) AS labels ORDER BY p.last_name',
    );
    return records.map(r => ({
      ...this.neo4j.toPlainObject(r.get('p').properties),
      labels: r.get('labels'),
    }));
  }

  async getResidents(tenantId: string) {
    const records = await this.neo4j.runQuery(`
      MATCH (p:Person:Resident)-[:LIVES_IN {tenant_id: $tenantId}]->(l:Location)
      RETURN DISTINCT p, labels(p) AS labels, l.name AS locationName
      ORDER BY p.last_name`,
      { tenantId });
    return records.map(r => ({
      ...this.neo4j.toPlainObject(r.get('p').properties),
      labels:   r.get('labels'),
      location: r.get('locationName'),
    }));
  }

  async getArtists() {
    const records = await this.neo4j.runQuery(
      'MATCH (p:Person:Artist) RETURN p, labels(p) AS labels ORDER BY p.last_name',
    );
    return records.map(r => ({
      ...this.neo4j.toPlainObject(r.get('p').properties),
      labels: r.get('labels'),
    }));
  }
}

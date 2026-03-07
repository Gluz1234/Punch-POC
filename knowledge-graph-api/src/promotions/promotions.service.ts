import { Injectable, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { ENTITY_CONFIGS } from '../shared/entity-config';
import { PromotionSchemaService } from './promotion-schema.service';
import { BUILTIN_SUBTYPES, getSubtypeDefinitionByKey } from './subtype-config';

@Injectable()
export class PromotionsService implements OnApplicationBootstrap {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly promotionSchema: PromotionSchemaService,
  ) {}

  /**
   * Auto-register built-in subtypes (Student, Employee, Resident, Researcher, Artist)
   * on application bootstrap. This ensures that these subtypes are always available
   * in Neo4j without requiring manual schema POSTs.
   */
  async onApplicationBootstrap() {
    console.log('📋 Initializing promotion subtypes...');
    try {
      await this.promotionSchema.registerMultipleSubtypes(BUILTIN_SUBTYPES);
      console.log('✅ Promotion subtypes initialized');
    } catch (err) {
      console.error('❌ Failed to initialize promotion subtypes:', err);
      // Don't throw — allow the app to continue even if schemas fail to register
    }
  }

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
    // Ensure Student subtype definition is registered (fallback if app startup failed)
    await this.ensureSubtypeDefinition('student');

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
    // Ensure Employee subtype definition is registered (fallback if app startup failed)
    await this.ensureSubtypeDefinition('employee');

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
    // Ensure Resident subtype definition is registered (fallback if app startup failed)
    await this.ensureSubtypeDefinition('resident');

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
    // Ensure Researcher subtype definition is registered (fallback if app startup failed)
    await this.ensureSubtypeDefinition('researcher');

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

  // ── Promote to :Artist ────────────────────────────────────────────────────

  async promoteToArtist(strongId: string, dto: any) {
    // Ensure Artist subtype definition is registered (fallback if app startup failed)
    await this.ensureSubtypeDefinition('artist');

    const records = await this.neo4j.runQuery(`
      MATCH (p:Person {strong_id: $strongId})
      SET p:Artist
      SET p.artist_id           = $artistId,
          p.primary_medium      = $primaryMedium,
          p.years_active_start  = $yearsActiveStart,
          p.years_active_end    = $yearsActiveEnd,
          p.style               = $style
      RETURN p, labels(p) AS labels`, {
      strongId,
      artistId:        dto.artistId        ?? null,
      primaryMedium:   dto.primaryMedium   ?? null,
      yearsActiveStart: dto.yearsActiveStart ?? null,
      yearsActiveEnd:  dto.yearsActiveEnd  ?? null,
      style:           dto.style           ?? null,
    });
    if (!records.length) throw new NotFoundException(`Person ${strongId} not found`);
    return {
      ...this.neo4j.toPlainObject(records[0].get('p').properties),
      labels: records[0].get('labels'),
    };
  }

  // ── Generic Subtype Promotion ───────────────────────────────────────────

  /**
   * Promote a Person to a subtype (built-in or user-defined).
   *
   * When a new subtype label is encountered:
   *   1. Extract property keys from the request body (after snake-casing)
   *   2. Automatically create/update PromotionSubtype definition for that label
   *   3. On subsequent calls, merge in any new property keys it hasn't seen before
   *
   * This allows users to define a subtype dynamically just by using it once with properties.
   */
  async promoteToSubtype(strongId: string, subtype: string, properties: Record<string, any>) {
    const safeSubtype = this.neo4j.sanitizeIdentifier(subtype);
    const safeProps = this.sanitizePropertyKeys(properties);

    // Auto-register user-defined subtype: extract property keys from this request body
    const propertyKeys = Object.keys(safeProps);

    if (propertyKeys.length > 0) {
      try {
        // Register or update the subtype definition, merging with any existing properties
        await this.promotionSchema.upsertSubtypeDefinitionMerging({
          key: safeSubtype.toLowerCase(),
          label: safeSubtype,
          baseLabel: 'Person',
          properties: propertyKeys,
        });
        console.log(
          `✓ Auto-registered subtype "${safeSubtype}" with properties: ${propertyKeys.join(', ')}`
        );
      } catch (err) {
        console.warn(
          `⚠ Failed to auto-register subtype "${safeSubtype}":`,
          err
        );
        // Don't throw — allow the promotion to proceed even if registration fails
      }
    }

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

  /**
   * Ensure a built-in subtype definition is registered in Neo4j.
   * Called as a fallback from each promotion method in case the app startup registration failed.
   * Safe to call multiple times — idempotent.
   */
  private async ensureSubtypeDefinition(key: string) {
    try {
      const definition = getSubtypeDefinitionByKey(key);
      if (!definition) return;

      // Try to register; if already exists, upsertSubtypeDefinition will just update/verify it
      await this.promotionSchema.upsertSubtypeDefinition(definition);
    } catch (err) {
      console.warn(`⚠ Failed to ensure subtype "${key}" is registered:`, err);
      // Don't throw — allow the promotion to proceed
    }
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

// ── Helper DTOs for typed property responses ─────────────────────────────────

export interface TypedPropertiesResponse {
  strongId: string;
  labels: string[];
  base: {
    label: string;
    properties: Record<string, any>;
  };
  subtypes: {
    label: string;
    properties: Record<string, any>;
  }[];
  /**
   * Properties that are not declared on the base entity or any known subtype.
   * This safely captures ad-hoc or future dynamic fields.
   */
  unknownProperties: Record<string, any>;
}

// ── Generic typed-property projection for Person promotions ──────────────────

@Injectable()
export class PromotionProjectionService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly schema: PromotionSchemaService,
  ) {}

  /**
   * Return a Person node with its properties grouped by:
   * - base Person properties
   * - each promotion subtype's properties (Student, Employee, etc.)
   * - unknown / unclassified properties
   */
  async getPersonTypedProperties(strongId: string): Promise<TypedPropertiesResponse> {
    const records = await this.neo4j.runQuery(
      `
      MATCH (p:Person {strong_id: $strongId})
      RETURN p, labels(p) AS labels
      `,
      { strongId },
    );

    if (!records.length) {
      throw new NotFoundException(`Person ${strongId} not found`);
    }

    const node = records[0].get('p');
    const labels: string[] = records[0].get('labels');
    const props = this.neo4j.toPlainObject(node.properties);

    const personConfig = ENTITY_CONFIGS.person;
    const basePropKeys = new Set<string>([
      personConfig.idField,
      ...Object.keys(personConfig.properties),
    ]);

    // Map subtype label → set of property keys for that subtype
    const subtypePropSets = new Map<string, Set<string>>();
    const defs = await this.schema.getSubtypeDefinitionsForBase(personConfig.label);
    defs.forEach((cfg) => {
      subtypePropSets.set(cfg.label, new Set<string>(cfg.properties));
    });

    const baseProperties: Record<string, any> = {};
    const subtypeBuckets: Record<string, Record<string, any>> = {};
    const unknownProperties: Record<string, any> = {};

    for (const [key, value] of Object.entries(props)) {
      if (basePropKeys.has(key)) {
        baseProperties[key] = value;
        continue;
      }

      let assignedToSubtype = false;

      // Try to assign the property to one of the subtype labels on this node
      for (const label of labels) {
        const propSet = subtypePropSets.get(label);
        if (propSet && propSet.has(key)) {
          if (!subtypeBuckets[label]) {
            subtypeBuckets[label] = {};
          }
          subtypeBuckets[label][key] = value;
          assignedToSubtype = true;
          break;
        }
      }

      if (!assignedToSubtype) {
        unknownProperties[key] = value;
      }
    }

    return {
      strongId,
      labels,
      base: {
        label: personConfig.label,
        properties: baseProperties,
      },
      subtypes: Object.entries(subtypeBuckets).map(([label, properties]) => ({
        label,
        properties,
      })),
      unknownProperties,
    };
  }
}

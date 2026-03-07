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
exports.PromotionProjectionService = exports.PromotionsService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../neo4j/neo4j.service");
const entity_config_1 = require("../shared/entity-config");
const promotion_schema_service_1 = require("./promotion-schema.service");
const subtype_config_1 = require("./subtype-config");
let PromotionsService = class PromotionsService {
    constructor(neo4j, promotionSchema) {
        this.neo4j = neo4j;
        this.promotionSchema = promotionSchema;
    }
    async onApplicationBootstrap() {
        console.log('📋 Initializing promotion subtypes...');
        try {
            await this.promotionSchema.registerMultipleSubtypes(subtype_config_1.BUILTIN_SUBTYPES);
            console.log('✅ Promotion subtypes initialized');
        }
        catch (err) {
            console.error('❌ Failed to initialize promotion subtypes:', err);
        }
    }
    async getLabels(strongId) {
        const records = await this.neo4j.runQuery('MATCH (p:Person {strong_id: $strongId}) RETURN labels(p) AS labels', { strongId });
        if (!records.length)
            throw new common_1.NotFoundException(`Person ${strongId} not found`);
        return { strongId, labels: records[0].get('labels') };
    }
    async promoteToStudent(strongId, dto) {
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
    async promoteToArtist(strongId, dto) {
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
            artistId: dto.artistId ?? null,
            primaryMedium: dto.primaryMedium ?? null,
            yearsActiveStart: dto.yearsActiveStart ?? null,
            yearsActiveEnd: dto.yearsActiveEnd ?? null,
            style: dto.style ?? null,
        });
        if (!records.length)
            throw new common_1.NotFoundException(`Person ${strongId} not found`);
        return {
            ...this.neo4j.toPlainObject(records[0].get('p').properties),
            labels: records[0].get('labels'),
        };
    }
    async promoteToSubtype(strongId, subtype, properties) {
        const safeSubtype = this.neo4j.sanitizeIdentifier(subtype);
        const safeProps = this.sanitizePropertyKeys(properties);
        const propertyKeys = Object.keys(safeProps);
        if (propertyKeys.length > 0) {
            try {
                await this.promotionSchema.upsertSubtypeDefinitionMerging({
                    key: safeSubtype.toLowerCase(),
                    label: safeSubtype,
                    baseLabel: 'Person',
                    properties: propertyKeys,
                });
                console.log(`✓ Auto-registered subtype "${safeSubtype}" with properties: ${propertyKeys.join(', ')}`);
            }
            catch (err) {
                console.warn(`⚠ Failed to auto-register subtype "${safeSubtype}":`, err);
            }
        }
        const setParts = Object.keys(safeProps).map(k => `p.\`${k}\` = $prop_${k}`).join(', ');
        const setClause = setParts ? `SET ${setParts}` : '';
        const params = { strongId };
        for (const [k, v] of Object.entries(safeProps)) {
            params[`prop_${k}`] = v;
        }
        const records = await this.neo4j.runQuery(`
      MATCH (p:Person {strong_id: $strongId})
      SET p:\`${safeSubtype}\`
      ${setClause}
      RETURN p, labels(p) AS labels`, params);
        if (!records.length)
            throw new common_1.NotFoundException(`Person ${strongId} not found`);
        return {
            ...this.neo4j.toPlainObject(records[0].get('p').properties),
            labels: records[0].get('labels'),
        };
    }
    sanitizePropertyKeys(dto) {
        const result = {};
        for (const [k, v] of Object.entries(dto || {})) {
            if (v !== undefined && v !== null) {
                const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                result[snakeKey] = v;
            }
        }
        return result;
    }
    async ensureSubtypeDefinition(key) {
        try {
            const definition = (0, subtype_config_1.getSubtypeDefinitionByKey)(key);
            if (!definition)
                return;
            await this.promotionSchema.upsertSubtypeDefinition(definition);
        }
        catch (err) {
            console.warn(`⚠ Failed to ensure subtype "${key}" is registered:`, err);
        }
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
    async getArtists() {
        const records = await this.neo4j.runQuery('MATCH (p:Person:Artist) RETURN p, labels(p) AS labels ORDER BY p.last_name');
        return records.map(r => ({
            ...this.neo4j.toPlainObject(r.get('p').properties),
            labels: r.get('labels'),
        }));
    }
};
exports.PromotionsService = PromotionsService;
exports.PromotionsService = PromotionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService,
        promotion_schema_service_1.PromotionSchemaService])
], PromotionsService);
let PromotionProjectionService = class PromotionProjectionService {
    constructor(neo4j, schema) {
        this.neo4j = neo4j;
        this.schema = schema;
    }
    async getPersonTypedProperties(strongId) {
        const records = await this.neo4j.runQuery(`
      MATCH (p:Person {strong_id: $strongId})
      RETURN p, labels(p) AS labels
      `, { strongId });
        if (!records.length) {
            throw new common_1.NotFoundException(`Person ${strongId} not found`);
        }
        const node = records[0].get('p');
        const labels = records[0].get('labels');
        const props = this.neo4j.toPlainObject(node.properties);
        const personConfig = entity_config_1.ENTITY_CONFIGS.person;
        const basePropKeys = new Set([
            personConfig.idField,
            ...Object.keys(personConfig.properties),
        ]);
        const subtypePropSets = new Map();
        const defs = await this.schema.getSubtypeDefinitionsForBase(personConfig.label);
        defs.forEach((cfg) => {
            subtypePropSets.set(cfg.label, new Set(cfg.properties));
        });
        const baseProperties = {};
        const subtypeBuckets = {};
        const unknownProperties = {};
        for (const [key, value] of Object.entries(props)) {
            if (basePropKeys.has(key)) {
                baseProperties[key] = value;
                continue;
            }
            let assignedToSubtype = false;
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
};
exports.PromotionProjectionService = PromotionProjectionService;
exports.PromotionProjectionService = PromotionProjectionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService,
        promotion_schema_service_1.PromotionSchemaService])
], PromotionProjectionService);
//# sourceMappingURL=promotions.service.js.map
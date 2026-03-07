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
exports.SchemaService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../neo4j/neo4j.service");
const entity_config_1 = require("../shared/entity-config");
const schema_registration_service_1 = require("./schema-registration.service");
const promotion_schema_service_1 = require("../promotions/promotion-schema.service");
let SchemaService = class SchemaService {
    constructor(neo4j, schemaRegistration, promotionSchema) {
        this.neo4j = neo4j;
        this.schemaRegistration = schemaRegistration;
        this.promotionSchema = promotionSchema;
    }
    async getLabels() {
        const records = await this.neo4j.runQuery('CALL db.labels() YIELD label RETURN label ORDER BY label');
        return records.map(r => r.get('label'));
    }
    async getRelationshipTypes() {
        const records = await this.neo4j.runQuery('CALL db.relationshipTypes() YIELD relationshipType RETURN relationshipType ORDER BY relationshipType');
        return records.map(r => r.get('relationshipType'));
    }
    async getConstraints() {
        const records = await this.neo4j.runQuery('SHOW CONSTRAINTS');
        return records.map(r => ({
            name: r.get('name'),
            type: r.get('type'),
            entityType: r.get('entityType'),
            labelsOrTypes: r.get('labelsOrTypes'),
            properties: r.get('properties'),
        }));
    }
    async getIndexes() {
        const records = await this.neo4j.runQuery('SHOW INDEXES');
        return records.map(r => ({
            name: r.get('name'),
            type: r.get('type'),
            state: r.get('state'),
            labelsOrTypes: r.get('labelsOrTypes'),
            properties: r.get('properties'),
        }));
    }
    async getPropertiesForLabel(label) {
        const registeredSchema = await this.schemaRegistration.getEntitySchema(label);
        if (registeredSchema) {
            return {
                label,
                properties: registeredSchema.properties,
                totalProperties: registeredSchema.properties.length,
            };
        }
        const entityConfig = (0, entity_config_1.getAllEntities)().find(e => e.label === label);
        if (entityConfig) {
            const typeMap = entityConfig.propertyTypes ?? {};
            const props = [];
            if (entityConfig.idField) {
                const idType = typeMap[entityConfig.idField] || 'Unknown';
                props.push({ name: entityConfig.idField, type: idType });
            }
            const sortedKeys = Object.keys(entityConfig.properties).sort();
            for (const key of sortedKeys) {
                const propType = typeMap[key] || 'Unknown';
                props.push({ name: key, type: propType });
            }
            try {
                await this.schemaRegistration.upsertEntitySchema({
                    key: entityConfig.key,
                    label: entityConfig.label,
                    properties: props,
                });
            }
            catch (err) {
                console.warn(`⚠ Failed to auto-register entity schema for ${label}:`, err);
            }
            return {
                label,
                properties: props,
                totalProperties: props.length,
            };
        }
        try {
            const subtypeDefs = await this.promotionSchema.getSubtypeDefinitionsForBase('Person');
            const subtypeDef = subtypeDefs.find(st => st.label === label);
            if (subtypeDef) {
                const subtypeProps = subtypeDef.properties.map(prop => ({
                    name: prop,
                    type: 'String'
                }));
                return {
                    label,
                    properties: subtypeProps,
                    totalProperties: subtypeProps.length,
                };
            }
        }
        catch (err) {
            console.warn(`⚠ Failed to check promotion subtypes for ${label}:`, err);
        }
        const safeLabel = this.neo4j.sanitizeIdentifier(label);
        const keyRecords = await this.neo4j.runQuery(`MATCH (n:\`${safeLabel}\`) WITH n LIMIT 100
       UNWIND keys(n) AS key
       RETURN DISTINCT key ORDER BY key`);
        const properties = keyRecords.map(r => r.get('key'));
        const typeRecords = await this.neo4j.runQuery(`CALL apoc.meta.data() YIELD label, property, type
       WHERE label = $label
       RETURN property, type ORDER BY property`, { label });
        const typeMap = {};
        typeRecords.forEach(r => {
            typeMap[r.get('property')] = r.get('type');
        });
        const propertiesWithTypes = properties.map(prop => ({
            name: prop,
            type: typeMap[prop] || 'Unknown'
        }));
        return {
            label,
            properties: propertiesWithTypes,
            totalProperties: properties.length
        };
    }
    async getPropertiesForRelType(relType) {
        const safeType = this.neo4j.sanitizeIdentifier(relType);
        const keyRecords = await this.neo4j.runQuery(`MATCH ()-[r:\`${safeType}\`]->() WITH r LIMIT 100
       UNWIND keys(r) AS key
       RETURN DISTINCT key ORDER BY key`);
        const properties = keyRecords.map(r => r.get('key'));
        const typeRecords = await this.neo4j.runQuery(`CALL apoc.meta.data() YIELD label, property, type
       WHERE label = $relType
       RETURN property, type ORDER BY property`, { relType });
        const typeMap = {};
        typeRecords.forEach(r => {
            typeMap[r.get('property')] = r.get('type');
        });
        const propertiesWithTypes = properties.map(prop => ({
            name: prop,
            type: typeMap[prop] || 'Unknown'
        }));
        return {
            relationshipType: relType,
            properties: propertiesWithTypes,
            totalProperties: properties.length
        };
    }
    async getFullSchema() {
        await this.schemaRegistration.registerAllBaseEntities();
        await this.schemaRegistration.registerAllBuiltinSubtypes();
        const [labels, relTypes, constraints] = await Promise.all([
            this.getLabels(),
            this.getRelationshipTypes(),
            this.getConstraints(),
        ]);
        const [labelDetails, relDetails] = await Promise.all([
            Promise.all(labels.map(l => this.getPropertiesForLabel(l))),
            Promise.all(relTypes.map(t => this.getPropertiesForRelType(t))),
        ]);
        return { nodeLabels: labelDetails, relationshipTypes: relDetails, constraints };
    }
    async getCounts() {
        const labels = await this.getLabels();
        return Promise.all(labels.map(async (label) => {
            const safeLabel = this.neo4j.sanitizeIdentifier(label);
            const records = await this.neo4j.runQuery(`MATCH (n:\`${safeLabel}\`) RETURN count(n) AS count`);
            return { label, count: records[0].get('count').toNumber() };
        }));
    }
    async getTenants() {
        const records = await this.neo4j.runQuery(`
      MATCH ()-[r]->()
      WHERE r.tenant_id IS NOT NULL
      RETURN DISTINCT r.tenant_id AS tenant ORDER BY tenant`);
        return records.map(r => r.get('tenant'));
    }
};
exports.SchemaService = SchemaService;
exports.SchemaService = SchemaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService,
        schema_registration_service_1.SchemaRegistrationService,
        promotion_schema_service_1.PromotionSchemaService])
], SchemaService);
//# sourceMappingURL=schema.service.js.map
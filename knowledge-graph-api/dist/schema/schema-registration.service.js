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
exports.SchemaRegistrationService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../neo4j/neo4j.service");
const entity_config_1 = require("../shared/entity-config");
const subtype_config_1 = require("../promotions/subtype-config");
let SchemaRegistrationService = class SchemaRegistrationService {
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async onApplicationBootstrap() {
        console.log('📋 Initializing entity schemas...');
        try {
            await this.registerAllBaseEntities();
            await this.registerAllBuiltinSubtypes();
            console.log('✅ Entity schemas initialized');
        }
        catch (err) {
            console.error('❌ Failed to initialize entity schemas:', err);
        }
    }
    async registerAllBaseEntities() {
        const entities = (0, entity_config_1.getAllEntities)();
        for (const entity of entities) {
            try {
                await this.upsertEntitySchema(this.convertEntityConfigToSchema(entity));
                console.log(`✓ Registered base entity: ${entity.label}`);
            }
            catch (err) {
                console.warn(`✗ Failed to register base entity ${entity.label}:`, err);
            }
        }
    }
    async registerAllBuiltinSubtypes() {
        for (const subtype of subtype_config_1.BUILTIN_SUBTYPES) {
            try {
                await this.upsertEntitySchema({
                    key: subtype.key,
                    label: subtype.label,
                    properties: subtype.properties.map(name => ({ name, type: 'String' })),
                });
                console.log(`✓ Registered subtype entity: ${subtype.label}`);
            }
            catch (err) {
                console.warn(`✗ Failed to register subtype entity ${subtype.label}:`, err);
            }
        }
    }
    async upsertEntitySchema(entity) {
        try {
            await this.neo4j.runQuery(`
        MATCH (e:EntitySchema { key: $key })
        OPTIONAL MATCH (e)-[r:HAS_PROPERTY]->(p:SchemaProperty)
        DELETE r, p
        `, { key: entity.key }).catch(err => {
                console.warn(`⚠ Could not clean up existing schema for ${entity.key}:`, err.message);
            });
            await this.neo4j.runQuery(`
        MERGE (e:EntitySchema { key: $key })
        SET e.label = $label
        `, { key: entity.key, label: entity.label });
            for (const prop of entity.properties) {
                await this.neo4j.runQuery(`
          MATCH (e:EntitySchema { key: $key })
          MERGE (p:SchemaProperty { name: $propName, type: $propType })
          MERGE (e)-[:HAS_PROPERTY]->(p)
          `, {
                    key: entity.key,
                    propName: prop.name,
                    propType: prop.type,
                });
            }
        }
        catch (err) {
            console.warn(`⚠ Failed to upsert entity schema for ${entity.key}:`, err.message);
        }
    }
    async getAllEntitySchemas() {
        const records = await this.neo4j.runQuery(`
      MATCH (e:EntitySchema)
      OPTIONAL MATCH (e)-[:HAS_PROPERTY]->(p:SchemaProperty)
      RETURN e.key AS key, e.label AS label,
             collect({ name: p.name, type: p.type }) AS properties
      ORDER BY e.label
      `);
        return records.map(r => ({
            key: r.get('key'),
            label: r.get('label'),
            properties: (r.get('properties') ?? []).filter(p => p.name),
        }));
    }
    async getEntitySchema(label) {
        const records = await this.neo4j.runQuery(`
      MATCH (e:EntitySchema { label: $label })
      OPTIONAL MATCH (e)-[:HAS_PROPERTY]->(p:SchemaProperty)
      RETURN e.key AS key, e.label AS label,
             collect({ name: p.name, type: p.type }) AS properties
      `, { label });
        if (!records.length)
            return null;
        const r = records[0];
        return {
            key: r.get('key'),
            label: r.get('label'),
            properties: (r.get('properties') ?? []).filter(p => p.name),
        };
    }
    async ensureEntitySchema(key) {
        try {
            const entity = (0, entity_config_1.getAllEntities)().find(e => e.key === key);
            if (!entity)
                return;
            await this.upsertEntitySchema(this.convertEntityConfigToSchema(entity));
        }
        catch (err) {
            console.warn(`⚠ Failed to ensure entity "${key}" schema is registered:`, err);
        }
    }
    convertEntityConfigToSchema(entity) {
        const typeMap = entity.propertyTypes ?? {};
        const properties = [];
        if (entity.idField) {
            const idType = typeMap[entity.idField] || 'String';
            properties.push({ name: entity.idField, type: idType });
        }
        const sortedKeys = Object.keys(entity.properties).sort();
        for (const key of sortedKeys) {
            const propType = typeMap[key] || 'String';
            properties.push({ name: key, type: propType });
        }
        return {
            key: entity.key,
            label: entity.label,
            properties,
        };
    }
    async registerUserDefinedEntity(key, label, properties) {
        await this.upsertEntitySchema({ key, label, properties });
        console.log(`✓ Auto-registered user-defined entity "${label}" with ${properties.length} properties`);
    }
};
exports.SchemaRegistrationService = SchemaRegistrationService;
exports.SchemaRegistrationService = SchemaRegistrationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], SchemaRegistrationService);
//# sourceMappingURL=schema-registration.service.js.map
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
exports.PromotionSchemaService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../neo4j/neo4j.service");
let PromotionSchemaService = class PromotionSchemaService {
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async upsertSubtypeDefinition(dto) {
        const properties = Array.from(new Set(dto.properties ?? [])).filter(Boolean);
        const records = await this.neo4j.runQuery(`
      MERGE (s:PromotionSubtype { key: $key })
      SET s.label = $label,
          s.base_label = $baseLabel
      WITH s
      OPTIONAL MATCH (s)-[r:HAS_FIELD]->(f:PromotionField)
      DELETE r
      WITH s
      UNWIND $properties AS propName
      MERGE (f:PromotionField { name: propName })
      MERGE (s)-[:HAS_FIELD]->(f)
      RETURN s.key        AS key,
             s.label      AS label,
             s.base_label AS baseLabel,
             $properties  AS properties
      `, {
            key: dto.key,
            label: dto.label,
            baseLabel: dto.baseLabel,
            properties,
        });
        const row = records[0];
        return {
            key: row.get('key'),
            label: row.get('label'),
            baseLabel: row.get('baseLabel'),
            properties: row.get('properties'),
        };
    }
    async getSubtypeDefinitionsForBase(baseLabel) {
        const records = await this.neo4j.runQuery(`
      MATCH (s:PromotionSubtype { base_label: $baseLabel })
      OPTIONAL MATCH (s)-[:HAS_FIELD]->(f:PromotionField)
      RETURN s.key        AS key,
             s.label      AS label,
             s.base_label AS baseLabel,
             collect(DISTINCT f.name) AS properties
      ORDER BY label
      `, { baseLabel });
        return records.map((r) => ({
            key: r.get('key'),
            label: r.get('label'),
            baseLabel: r.get('baseLabel'),
            properties: (r.get('properties') ?? []),
        }));
    }
    async getAllSubtypeDefinitions() {
        const records = await this.neo4j.runQuery(`
      MATCH (s:PromotionSubtype)
      OPTIONAL MATCH (s)-[:HAS_FIELD]->(f:PromotionField)
      RETURN s.key        AS key,
             s.label      AS label,
             s.base_label AS baseLabel,
             collect(DISTINCT f.name) AS properties
      ORDER BY baseLabel, label
      `);
        return records.map((r) => ({
            key: r.get('key'),
            label: r.get('label'),
            baseLabel: r.get('baseLabel'),
            properties: (r.get('properties') ?? []),
        }));
    }
    async getPropertiesForSubtype(key) {
        const records = await this.neo4j.runQuery(`
      MATCH (s:PromotionSubtype { key: $key })
      OPTIONAL MATCH (s)-[:HAS_FIELD]->(f:PromotionField)
      RETURN collect(DISTINCT f.name) AS properties
      `, { key });
        if (!records.length)
            return [];
        return (records[0].get('properties') ?? []);
    }
    async upsertSubtypeDefinitionMerging(dto) {
        const existing = await this.getPropertiesForSubtype(dto.key);
        const merged = Array.from(new Set([...existing, ...(dto.properties ?? [])])).filter(Boolean);
        return this.upsertSubtypeDefinition({
            ...dto,
            properties: merged,
        });
    }
    async registerMultipleSubtypes(subtypes) {
        const results = [];
        for (const subtype of subtypes) {
            try {
                const result = await this.upsertSubtypeDefinition(subtype);
                results.push(result);
                console.log(`✓ Registered subtype: ${subtype.label}`);
            }
            catch (err) {
                console.warn(`✗ Failed to register subtype ${subtype.label}:`, err);
            }
        }
        return results;
    }
};
exports.PromotionSchemaService = PromotionSchemaService;
exports.PromotionSchemaService = PromotionSchemaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], PromotionSchemaService);
//# sourceMappingURL=promotion-schema.service.js.map
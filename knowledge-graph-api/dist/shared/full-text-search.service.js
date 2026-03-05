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
exports.FullTextSearchService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_driver_1 = require("neo4j-driver");
const neo4j_service_1 = require("../neo4j/neo4j.service");
const entity_config_1 = require("./entity-config");
let FullTextSearchService = class FullTextSearchService {
    constructor(neo4j) {
        this.neo4j = neo4j;
        this.searchIndexes = new Map();
        this.fulltextAvailable = null;
    }
    async initializeIndexes() {
        console.log('\n📚 Initializing search indexes...');
        await this.checkFulltextAvailability();
        if (!this.fulltextAvailable) {
            console.log('  ℹ Using fallback Cypher pattern matching (fulltext procedures unavailable)');
            console.log('  ✓ All entities ready for search via contained string matching\n');
            return;
        }
        for (const [key, config] of Object.entries(entity_config_1.ENTITY_CONFIGS)) {
            await this.createIndexForEntity(key, config);
        }
        console.log('✓ Full-text search indexes ready\n');
    }
    async checkFulltextAvailability() {
        if (this.fulltextAvailable !== null)
            return;
        try {
            await this.neo4j.runQuery('CALL db.index.fulltext.queryNodes("test", "test") YIELD node RETURN count(node)');
            this.fulltextAvailable = true;
        }
        catch (err) {
            if (err.message?.includes('no procedure with the name')) {
                console.log('  ℹ Fulltext search unavailable - using fallback search');
                this.fulltextAvailable = false;
            }
            else {
                this.fulltextAvailable = true;
            }
        }
    }
    async createIndexForEntity(key, config) {
        if (this.searchIndexes.has(key))
            return;
        try {
            const indexName = `${key}_fulltext_index`;
            const label = config.label;
            const textFields = Object.keys(config.properties).filter(prop => !prop.endsWith('_id') &&
                !prop.includes('date') &&
                !prop.includes('count') &&
                !prop.includes('score') &&
                !prop.includes('latitude') &&
                !prop.includes('longitude'));
            if (textFields.length === 0) {
                console.log(`  ⊘ ${key}: no text fields to index`);
                return;
            }
            try {
                await this.neo4j.runQuery(`
          CALL db.index.fulltext.createNodeIndex(
            $indexName,
            [$label],
            [${textFields.map(f => `'${f}'`).join(', ')}]
          )
        `, { indexName });
                console.log(`  ✓ ${indexName} (${textFields.join(', ')})`);
            }
            catch (err) {
                if (err.message?.includes('already exists')) {
                    console.log(`  ✓ ${indexName} (already exists)`);
                    this.searchIndexes.set(key, true);
                    return;
                }
                throw err;
            }
            this.searchIndexes.set(key, true);
        }
        catch (err) {
            console.warn(`  ⚠ Could not create index for ${key}:`, err.message);
        }
    }
    async search(config) {
        const entityConfig = entity_config_1.ENTITY_CONFIGS[config.entity];
        if (!entityConfig) {
            throw new common_1.BadRequestException(`Unknown entity: ${config.entity}`);
        }
        if (this.fulltextAvailable === null) {
            await this.checkFulltextAvailability();
        }
        if (this.fulltextAvailable) {
            return this.searchFulltext(config, entityConfig);
        }
        else {
            return this.searchFallback(config, entityConfig);
        }
    }
    async searchFulltext(config, entityConfig) {
        if (!this.searchIndexes.has(config.entity)) {
            await this.createIndexForEntity(config.entity, entityConfig);
        }
        const indexName = `${config.entity}_fulltext_index`;
        const idField = entityConfig.idField;
        const limit = config.limit || 50;
        let query = `
      CALL db.index.fulltext.queryNodes($indexName, $searchQuery)
      YIELD node AS n, score
      WHERE score > 0
    `;
        if (config.where) {
            query += `AND (${config.where})\n`;
        }
        if (config.tenantId && this.hasMultiTenantSupport(config.entity)) {
            query += `AND n.tenant_id = $tenantId\n`;
        }
        query += `
      RETURN n, score, labels(n) AS labels
      ORDER BY score DESC
      LIMIT $limit
    `;
        const params = {
            indexName,
            searchQuery: config.query,
            limit: neo4j_driver_1.default.int(limit),
        };
        if (config.tenantId) {
            params.tenantId = config.tenantId;
        }
        try {
            const records = await this.neo4j.runQuery(query, params);
            return records.map(r => ({
                entity: config.entity,
                id: this.neo4j.toPlainObject(r.get('n').properties)[idField],
                score: r.get('score'),
                data: this.neo4j.toPlainObject(r.get('n').properties),
            }));
        }
        catch (err) {
            if (err.message?.includes('does not exist')) {
                return [];
            }
            throw err;
        }
    }
    async searchFallback(config, entityConfig) {
        const label = entityConfig.label;
        const idField = entityConfig.idField;
        const limit = config.limit || 50;
        const textFields = Object.keys(entityConfig.properties).filter(prop => !prop.endsWith('_id') &&
            !prop.includes('date') &&
            !prop.includes('count'));
        if (textFields.length === 0) {
            return [];
        }
        const searchTerm = `%${config.query.toUpperCase()}%`;
        const orConditions = textFields
            .map(field => `toUpper(toString(n.\`${field}\`)) CONTAINS toUpper($searchQuery)`)
            .join(' OR ');
        let query = `
      MATCH (n:\`${label}\`)
      WHERE (${orConditions})
    `;
        if (config.where) {
            query += `AND (${config.where})\n`;
        }
        if (config.tenantId && this.hasMultiTenantSupport(config.entity)) {
            query += `AND n.tenant_id = $tenantId\n`;
        }
        query += `
      RETURN n, labels(n) AS labels
      ORDER BY n.\`${idField}\`
      LIMIT $limit
    `;
        const params = {
            searchQuery: config.query,
            limit: neo4j_driver_1.default.int(limit),
        };
        if (config.tenantId) {
            params.tenantId = config.tenantId;
        }
        try {
            const records = await this.neo4j.runQuery(query, params);
            return records.map(r => ({
                entity: config.entity,
                id: this.neo4j.toPlainObject(r.get('n').properties)[idField],
                score: 1.0,
                data: this.neo4j.toPlainObject(r.get('n').properties),
            }));
        }
        catch (err) {
            console.error('Fallback search error:', err.message);
            return [];
        }
    }
    async searchPersons(query, tenantId, limit = 50) {
        return this.search({
            entity: 'person',
            query,
            tenantId,
            limit,
        });
    }
    async searchOrganizations(query, limit = 50) {
        return this.search({
            entity: 'organization',
            query,
            limit,
        });
    }
    async searchSkills(query, limit = 50) {
        return this.search({
            entity: 'skill',
            query,
            limit,
        });
    }
    async searchCourses(query, limit = 50) {
        return this.search({
            entity: 'course',
            query,
            limit,
        });
    }
    async searchWithFilter(entity, query, whereClause, limit = 50) {
        return this.search({
            entity,
            query,
            where: whereClause,
            limit,
        });
    }
    async advancedSearch(entity, luceneQuery, limit = 50) {
        return this.search({
            entity,
            query: luceneQuery,
            limit,
        });
    }
    hasMultiTenantSupport(entity) {
        return entity === 'person';
    }
};
exports.FullTextSearchService = FullTextSearchService;
exports.FullTextSearchService = FullTextSearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], FullTextSearchService);
//# sourceMappingURL=full-text-search.service.js.map
import { Injectable, BadRequestException } from '@nestjs/common';
import neo4j from 'neo4j-driver';
import { Neo4jService } from '../neo4j/neo4j.service';
import { ENTITY_CONFIGS } from './entity-config';

/**
 * Full-Text Search Service
 * 
 * Supports two modes:
 * 1. Neo4j Fulltext Indexes (if available)
 * 2. Fallback Cypher Pattern Matching (if fulltext unavailable)
 * 
 * Automatically detects and uses available search method.
 */
export interface FullTextSearchResult {
  entity: string;
  id: string;
  score: number; // Lucene relevance score (fulltext) or 1.0 (fallback)
  data: Record<string, any>;
}

export interface FullTextSearchConfig {
  entity: string;
  query: string;
  fields?: string[];
  where?: string;
  tenantId?: string;
  limit?: number;
}

@Injectable()
export class FullTextSearchService {
  private searchIndexes = new Map<string, boolean>();
  private fulltextAvailable: boolean | null = null;

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Initialize full-text indexes for all entities.
   * Call this once on application startup via main.ts.
   */
  async initializeIndexes() {
    console.log('\n📚 Initializing search indexes...');
    
    // Check if fulltext is available
    await this.checkFulltextAvailability();
    
    if (!this.fulltextAvailable) {
      console.log('  ℹ Using fallback Cypher pattern matching (fulltext procedures unavailable)');
      console.log('  ✓ All entities ready for search via contained string matching\n');
      return;
    }

    for (const [key, config] of Object.entries(ENTITY_CONFIGS)) {
      await this.createIndexForEntity(key, config);
    }
    console.log('✓ Full-text search indexes ready\n');
  }

  /**
   * Check if fulltext procedures are available in this Neo4j instance.
   */
  private async checkFulltextAvailability() {
    if (this.fulltextAvailable !== null) return;

    try {
      await this.neo4j.runQuery(
        'CALL db.index.fulltext.queryNodes("test", "test") YIELD node RETURN count(node)',
      );
      this.fulltextAvailable = true;
    } catch (err: any) {
      if (err.message?.includes('no procedure with the name')) {
        console.log('  ℹ Fulltext search unavailable - using fallback search');
        this.fulltextAvailable = false;
      } else {
        // Other errors might indicate the procedure exists but test failed differently
        this.fulltextAvailable = true;
      }
    }
  }

  /**
   * Create a full-text index for a specific entity (only if fulltext available).
   */
  private async createIndexForEntity(key: string, config: any) {
    if (this.searchIndexes.has(key)) return;

    try {
      const indexName = `${key}_fulltext_index`;
      const label = config.label;

      const textFields = Object.keys(config.properties).filter(
        prop =>
          !prop.endsWith('_id') &&
          !prop.includes('date') &&
          !prop.includes('count') &&
          !prop.includes('score') &&
          !prop.includes('latitude') &&
          !prop.includes('longitude'),
      );

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
      } catch (err: any) {
        if (err.message?.includes('already exists')) {
          console.log(`  ✓ ${indexName} (already exists)`);
          this.searchIndexes.set(key, true);
          return;
        }
        throw err;
      }

      this.searchIndexes.set(key, true);
    } catch (err: any) {
      console.warn(`  ⚠ Could not create index for ${key}:`, err.message);
    }
  }

  /**
   * Execute a search using fulltext (if available) or fallback method.
   */
  async search(config: FullTextSearchConfig): Promise<FullTextSearchResult[]> {
    const entityConfig = ENTITY_CONFIGS[config.entity];
    if (!entityConfig) {
      throw new BadRequestException(`Unknown entity: ${config.entity}`);
    }

    // Ensure we know if fulltext is available
    if (this.fulltextAvailable === null) {
      await this.checkFulltextAvailability();
    }

    // Use fulltext if available, otherwise fallback
    if (this.fulltextAvailable) {
      return this.searchFulltext(config, entityConfig);
    } else {
      return this.searchFallback(config, entityConfig);
    }
  }

  /**
   * Search using Neo4j Fulltext Index (preferred method).
   */
  private async searchFulltext(config: FullTextSearchConfig, entityConfig: any): Promise<FullTextSearchResult[]> {
    // Try to create index if not already attempted
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

    const params: Record<string, any> = {
      indexName,
      searchQuery: config.query,
      limit: neo4j.int(limit),
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
    } catch (err: any) {
      if (err.message?.includes('does not exist')) {
        return [];
      }
      throw err;
    }
  }

  /**
   * Fallback search using standard Cypher pattern matching.
   * Works on all Neo4j versions but less sophisticated than fulltext.
   */
  private async searchFallback(config: FullTextSearchConfig, entityConfig: any): Promise<FullTextSearchResult[]> {
    const label = entityConfig.label;
    const idField = entityConfig.idField;
    const limit = config.limit || 50;

    // Get text fields for pattern matching
    const textFields = Object.keys(entityConfig.properties).filter(
      prop =>
        !prop.endsWith('_id') &&
        !prop.includes('date') &&
        !prop.includes('count'),
    );

    if (textFields.length === 0) {
      return [];
    }

    // Build OR conditions for text field matching (case-insensitive)
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

    const params: Record<string, any> = {
      searchQuery: config.query,
      limit: neo4j.int(limit),
    };

    if (config.tenantId) {
      params.tenantId = config.tenantId;
    }

    try {
      const records = await this.neo4j.runQuery(query, params);
      return records.map(r => ({
        entity: config.entity,
        id: this.neo4j.toPlainObject(r.get('n').properties)[idField],
        score: 1.0, // Fallback always returns 1.0 (no ranking)
        data: this.neo4j.toPlainObject(r.get('n').properties),
      }));
    } catch (err: any) {
      console.error('Fallback search error:', err.message);
      return [];
    }
  }

  /** Search persons by text */
  async searchPersons(query: string, tenantId?: string, limit = 50) {
    return this.search({
      entity: 'person',
      query,
      tenantId,
      limit,
    });
  }

  /** Search organizations by text */
  async searchOrganizations(query: string, limit = 50) {
    return this.search({
      entity: 'organization',
      query,
      limit,
    });
  }

  /** Search skills by text */
  async searchSkills(query: string, limit = 50) {
    return this.search({
      entity: 'skill',
      query,
      limit,
    });
  }

  /** Search courses by text */
  async searchCourses(query: string, limit = 50) {
    return this.search({
      entity: 'course',
      query,
      limit,
    });
  }

  /** Search with WHERE clause filter */
  async searchWithFilter(
    entity: string,
    query: string,
    whereClause: string,
    limit = 50,
  ) {
    return this.search({
      entity,
      query,
      where: whereClause,
      limit,
    });
  }

  /** Advanced search with Lucene syntax (fulltext) or substring (fallback) */
  async advancedSearch(
    entity: string,
    luceneQuery: string,
    limit = 50,
  ): Promise<FullTextSearchResult[]> {
    return this.search({
      entity,
      query: luceneQuery,
      limit,
    });
  }

  private hasMultiTenantSupport(entity: string): boolean {
    return entity === 'person';
  }
}

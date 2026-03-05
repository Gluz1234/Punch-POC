import { Controller, Get, Post, Query, HttpCode, BadRequestException } from '@nestjs/common';
import { FullTextSearchService } from './full-text-search.service';

/**
 * Full-Text Search Controller
 * 
 * Leverages Neo4j's Lucene full-text search engine.
 * Supports advanced Lucene syntax:
 * - "john*" = prefix search
 * - "john AND smith" = AND search
 * - "john OR jane" = OR search
 * - "\"john smith\"" = phrase search (exact match)
 * - "john~" = fuzzy search (typo tolerance)
 * 
 * Results are ranked by relevance score.
 */
@Controller('search')
export class FullTextSearchController {
  constructor(private readonly searchService: FullTextSearchService) {}

  /**
   * GET /search/persons?q=john
   * Full-text search for persons across all text fields.
   */
  @Get('persons')
  @HttpCode(200)
  async searchPersons(
    @Query('q') query?: string,
    @Query('tenantId') tenantId?: string,
    @Query('limit') limit?: string,
  ) {
    if (!query) {
      throw new BadRequestException('Search query (q) is required');
    }
    const limitNum = limit ? Math.floor(parseInt(limit, 10)) : 50;
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      throw new BadRequestException('Limit must be a number between 1 and 1000');
    }
    return this.searchService.searchPersons(
      query,
      tenantId,
      limitNum,
    );
  }

  /**
   * GET /search/organizations?q=microsoft
   * Full-text search for organizations.
   */
  @Get('organizations')
  @HttpCode(200)
  async searchOrganizations(
    @Query('q') query?: string,
    @Query('limit') limit?: string,
  ) {
    if (!query) {
      throw new BadRequestException('Search query (q) is required');
    }
    const limitNum = limit ? Math.floor(parseInt(limit, 10)) : 50;
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      throw new BadRequestException('Limit must be a number between 1 and 1000');
    }
    return this.searchService.searchOrganizations(
      query,
      limitNum,
    );
  }

  /**
   * GET /search/skills?q=java
   * Full-text search for skills.
   */
  @Get('skills')
  @HttpCode(200)
  async searchSkills(
    @Query('q') query?: string,
    @Query('limit') limit?: string,
  ) {
    if (!query) {
      throw new BadRequestException('Search query (q) is required');
    }
    const limitNum = limit ? Math.floor(parseInt(limit, 10)) : 50;
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      throw new BadRequestException('Limit must be a number between 1 and 1000');
    }
    return this.searchService.searchSkills(
      query,
      limitNum,
    );
  }

  /**
   * GET /search/courses?q=java programming
   * Full-text search for courses.
   */
  @Get('courses')
  @HttpCode(200)
  async searchCourses(
    @Query('q') query?: string,
    @Query('limit') limit?: string,
  ) {
    if (!query) {
      throw new BadRequestException('Search query (q) is required');
    }
    const limitNum = limit ? Math.floor(parseInt(limit, 10)) : 50;
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      throw new BadRequestException('Limit must be a number between 1 and 1000');
    }
    return this.searchService.searchCourses(
      query,
      limitNum,
    );
  }

  /**
   * GET /search/advanced?entity=person&q=john*&limit=20
   * Advanced search with full Lucene syntax support.
   * 
   * Parameters:
   * - entity: person, organization, skill, course, etc.
   * - q: Lucene query syntax
   * - limit: Result limit (default: 50)
   */
  @Get('advanced')
  @HttpCode(200)
  async advancedSearch(
    @Query('entity') entity?: string,
    @Query('q') query?: string,
    @Query('limit') limit?: string,
  ) {
    if (!entity) {
      throw new BadRequestException('Entity type (entity) is required');
    }
    if (!query) {
      throw new BadRequestException('Search query (q) is required');
    }
    const limitNum = limit ? Math.floor(parseInt(limit, 10)) : 50;
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      throw new BadRequestException('Limit must be a number between 1 and 1000');
    }
    return this.searchService.advancedSearch(
      entity,
      query,
      limitNum,
    );
  }

  /**
   * POST /search/init-indexes
   * Manually initialize full-text indexes for all entities.
   * Call this if indexes weren't created during app startup.
   */
  @Post('init-indexes')
  @HttpCode(200)
  async initializeIndexes() {
    await this.searchService.initializeIndexes();
    return { 
      status: 'success',
      message: 'Full-text indexes initialized for all entities'
    };
  }
}

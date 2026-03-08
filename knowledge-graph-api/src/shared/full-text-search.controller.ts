import { Controller, Get, Post, Param, Query, HttpCode, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { FullTextSearchService } from './full-text-search.service';

/**
 * Full-Text Search Controller
 * 
 * Community Edition search engine with full query syntax:
 *   "john"       → contains (substring match across all text fields)
 *   "john*"      → prefix   (starts-with, scored higher than substring)
 *   "john~"      → fuzzy    (typo tolerance via APOC levenshtein)
 *   "john~0.8"   → fuzzy    (custom similarity threshold 0-1)
 *   "john AND s" → AND      (all terms must match)
 *   "john OR j"  → OR       (any term matches)
 *   "\"john s\"" → phrase   (exact phrase, scored highest)
 *   "john smith" → implicit AND (space-separated = AND)
 * 
 * All results are ranked by relevance score.
 */
@ApiTags('Search')
@Controller('search')
export class FullTextSearchController {
  constructor(private readonly searchService: FullTextSearchService) {}

  @Get(':entityType')
  @HttpCode(200)
  @ApiOperation({ 
    summary: 'Search any entity type', 
    description: 'Search any entity with rich query syntax. Supports: contains, prefix (*), fuzzy (~), AND/OR operators, phrase ("..."), and implicit AND for multi-word queries. Results ranked by relevance.' 
  })
  @ApiParam({ name: 'entityType', description: 'Entity type key', example: 'person' })
  @ApiQuery({ name: 'q', description: 'Search query (Lucene syntax)', example: 'john*', required: true })
  @ApiQuery({ name: 'tenantId', description: 'Optional tenant ID filter', required: false })
  @ApiQuery({ name: 'limit', description: 'Max results (1-1000)', required: false, example: 50 })
  @ApiResponse({ status: 200, description: 'Search results ranked by relevance score' })
  async searchEntity(
    @Param('entityType') entityType: string,
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
    return this.searchService.search({
      entity: entityType,
      query,
      tenantId,
      limit: limitNum,
    });
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

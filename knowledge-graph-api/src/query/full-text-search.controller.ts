import { Body, Controller, Get, Post, Param, Query, HttpCode, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AdvancedSearchRequest, FullTextSearchService } from './full-text-search.service';
import { TenantId } from '../auth/tenant.decorator';

/**
 * Full-Text Search Controller
 * 
 * Community Edition search engine with dynamic capabilities:
 * - free-text search across config-driven entity fields
 * - field-specific queries and numeric/date ranges
 * - relationship-aware filtering
 * - explanations, highlights, facets, aggregations, and autocomplete
 */
@ApiTags('Search')
@Controller('search')
export class FullTextSearchController {
  constructor(private readonly searchService: FullTextSearchService) {}

  @Get(':entityType/autocomplete')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Autocomplete values for any entity',
    description: 'Returns ranked suggestions dynamically from configured searchable fields. Supports optional field restriction and tenant scoping.',
  })
  @ApiParam({ name: 'entityType', description: 'Entity type key', example: 'person' })
  @ApiQuery({ name: 'q', description: 'Autocomplete prefix', example: 'jo', required: true })
  @ApiQuery({ name: 'field', description: 'Optional single field to autocomplete', required: false, example: 'first_name' })
  @ApiQuery({ name: 'fields', description: 'Optional comma-separated fields to autocomplete', required: false, example: 'first_name,last_name' })
  @ApiQuery({ name: 'limit', description: 'Max suggestions (1-100)', required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Autocomplete suggestions',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          entity: { type: 'string', example: 'person' },
          field: { type: 'string', example: 'first_name' },
          value: { type: 'string', example: 'John' },
          score: { type: 'number', example: 2 },
        },
      },
    },
  })
  async autocomplete(
    @Param('entityType') entityType: string,
    @Query('q') query?: string,
    @Query('field') field?: string,
    @Query('fields') fields?: string,
    @TenantId() tenantId?: string,
    @Query('limit') limit?: string,
  ) {
    if (!query) {
      throw new BadRequestException('Search query (q) is required');
    }

    return this.searchService.autocomplete(entityType, {
      query,
      field,
      fields: this.parseCsv(fields),
      tenantId,
      limit: this.parseLimit(limit, 10, 100),
    });
  }

  @Post(':entityType/query')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Run dynamic advanced search',
    description: 'Supports free-text search, field-specific filters, ranges, relationship-aware filters, explanations, facets, aggregations, and tenant scoping across any configured entity type.',
  })
  @ApiParam({ name: 'entityType', description: 'Entity type key', example: 'person' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Root free-text query', example: 'john' },
        fields: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional fields to use for root q',
          example: ['first_name', 'last_name'],
        },
        fieldQueries: {
          type: 'array',
          description: 'Field-specific query clauses',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string', example: 'email' },
              query: { type: 'string', example: 'gmail.com' },
              operator: {
                type: 'string',
                enum: ['contains', 'prefix', 'fuzzy', 'phrase', 'exact'],
                example: 'contains',
              },
              boost: { type: 'number', example: 1.5 },
            },
            required: ['field', 'query'],
          },
        },
        ranges: {
          type: 'array',
          description: 'Range filters for numeric/date fields',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string', example: 'birth_date' },
              gt: { oneOf: [{ type: 'string' }, { type: 'number' }] },
              gte: { oneOf: [{ type: 'string' }, { type: 'number' }], example: '1990-01-01' },
              lt: { oneOf: [{ type: 'string' }, { type: 'number' }] },
              lte: { oneOf: [{ type: 'string' }, { type: 'number' }] },
            },
            required: ['field'],
          },
        },
        relationships: {
          type: 'array',
          description: 'Relationship-aware filters',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', example: 'WORKS_AT' },
              direction: { type: 'string', enum: ['OUTGOING', 'INCOMING', 'BOTH'], example: 'OUTGOING' },
              entity: { type: 'string', example: 'organization' },
              targetFilters: {
                type: 'object',
                additionalProperties: true,
                example: { org_id: 'ORG_001' },
              },
              relationshipFilters: {
                type: 'object',
                additionalProperties: true,
                example: { role: 'Engineer' },
              },
              query: { type: 'string', example: 'mit' },
              fields: {
                type: 'array',
                items: { type: 'string' },
                example: ['name'],
              },
            },
          },
        },
        facets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string', example: 'status' },
              limit: { type: 'number', example: 10 },
            },
            required: ['field'],
          },
        },
        aggregations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              operation: {
                type: 'string',
                enum: ['count', 'countDistinct', 'min', 'max', 'avg', 'sum'],
                example: 'count',
              },
              field: { type: 'string', example: 'credits' },
              name: { type: 'string', example: 'total_results' },
            },
            required: ['operation'],
          },
        },
        explain: { type: 'boolean', example: true },
        tenantId: { type: 'string', example: 'TENANT_1' },
        limit: { type: 'number', example: 25 },
      },
      example: {
        q: 'john',
        fields: ['first_name', 'last_name'],
        fieldQueries: [
          { field: 'email', query: 'gmail.com', operator: 'contains', boost: 1.5 },
        ],
        ranges: [
          { field: 'birth_date', gte: '1990-01-01' },
        ],
        relationships: [
          {
            type: 'WORKS_AT',
            direction: 'OUTGOING',
            entity: 'organization',
            targetFilters: { org_id: 'ORG_001' },
            query: 'mit',
            fields: ['name'],
          },
        ],
        facets: [
          { field: 'status', limit: 10 },
        ],
        aggregations: [
          { operation: 'count', name: 'total_results' },
        ],
        explain: true,
        tenantId: 'TENANT_1',
        limit: 25,
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Advanced search results with optional facets, aggregations, and explanations',
    schema: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entity: { type: 'string', example: 'person' },
              id: { type: 'string', example: 'P_001' },
              score: { type: 'number', example: 8.5 },
              data: { type: 'object', additionalProperties: true },
              highlights: { type: 'object', additionalProperties: { type: 'string' } },
              matches: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    source: { type: 'string', example: 'field' },
                    field: { type: 'string', example: 'email' },
                    operator: { type: 'string', example: 'contains' },
                    query: { type: 'string', example: 'gmail.com' },
                    matchedValue: { type: 'string', example: 'john@gmail.com' },
                    scoreContribution: { type: 'number', example: 1.5 },
                  },
                },
              },
            },
          },
        },
        facets: {
          type: 'object',
          additionalProperties: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                value: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
                count: { type: 'number', example: 12 },
              },
            },
          },
        },
        aggregations: { type: 'object', additionalProperties: true },
        meta: {
          type: 'object',
          properties: {
            entity: { type: 'string', example: 'person' },
            resultCount: { type: 'number', example: 25 },
            requestedLimit: { type: 'number', example: 25 },
            explain: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  async advancedSearch(
    @Param('entityType') entityType: string,
    @Body() request: AdvancedSearchRequest,
  ) {
    return this.searchService.searchAdvanced(entityType, request ?? {});
  }

  @Get(':entityType')
  @HttpCode(200)
  @ApiOperation({ 
    summary: 'Search any entity type', 
    description: 'Simple generic search endpoint. Supports free-text operators such as prefix (*), fuzzy (~), phrase ("..."), AND/OR, and optional field restriction.' 
  })
  @ApiParam({ name: 'entityType', description: 'Entity type key', example: 'person' })
  @ApiQuery({ name: 'q', description: 'Search query with operators (*, ~, AND, OR, "phrase")', example: 'john*', required: true })
  @ApiQuery({ name: 'fields', description: 'Optional comma-separated fields to search within', required: false, example: 'first_name,last_name' })
  @ApiQuery({ name: 'limit', description: 'Max results (1-1000)', required: false, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Search results ranked by relevance score',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          entity: { type: 'string', example: 'person' },
          id: { type: 'string', example: 'P_001' },
          score: { type: 'number', example: 3 },
          data: { type: 'object', additionalProperties: true },
        },
      },
    },
  })
  async searchEntity(
    @Param('entityType') entityType: string,
    @Query('q') query?: string,
    @Query('fields') fields?: string,
    @TenantId() tenantId?: string,
    @Query('limit') limit?: string,
  ) {
    if (!query) {
      throw new BadRequestException('Search query (q) is required');
    }

    return this.searchService.search({
      entity: entityType,
      query,
      fields: this.parseCsv(fields),
      tenantId,
      limit: this.parseLimit(limit, 50, 1000),
    });
  }

  /**
   * POST /search/init-indexes
   * Keeps compatibility with the old route name, but now initializes the
   * Community search engine capabilities instead of Lucene indexes.
   */
  @Post('init-indexes')
  @HttpCode(200)
  async initializeIndexes() {
    await this.searchService.initializeIndexes();
    return { 
      status: 'success',
      message: 'Search engine initialized for all entities'
    };
  }

  private parseCsv(value?: string): string[] | undefined {
    if (!value?.trim()) {
      return undefined;
    }

    const parsed = value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

    return parsed.length ? parsed : undefined;
  }

  private parseLimit(
    value: string | undefined,
    fallback: number,
    max: number,
  ): number {
    if (!value) {
      return fallback;
    }

    const parsed = Math.floor(parseInt(value, 10));
    if (isNaN(parsed) || parsed < 1 || parsed > max) {
      throw new BadRequestException(`Limit must be a number between 1 and ${max}`);
    }

    return parsed;
  }
}

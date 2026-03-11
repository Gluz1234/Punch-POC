import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBody } from '@nestjs/swagger';
import { DataService } from './data.service';

@ApiTags('Data')
@Controller('data')
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get('tenant/:tenantId')
  @ApiOperation({ 
    summary: 'Get all nodes by tenant ID',
    description: 'Fetch all nodes connected to the same tenant ID with their properties and schema information. Properties are filtered to show only what belongs to each specific label.'
  })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID to filter nodes', example: 'tenant_mit' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of records per label', example: 10000 })
  @ApiResponse({ status: 200, description: 'Returns nodes grouped by label with schemas and statistics' })
  getNodesByTenant(
    @Param('tenantId') tenantId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10000;
    return this.dataService.getAllNodesByTenant(tenantId, limitNum);
  }

  @Get('relationships/tenant/:tenantId')
  @ApiOperation({ 
    summary: 'Get all relationships by tenant ID',
    description: 'Fetch all relationships for a specific tenant ID, including source and target node data'
  })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID to filter relationships', example: 'tenant_google' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of relationships', example: 10000 })
  @ApiResponse({ status: 200, description: 'Returns relationships grouped by type with statistics' })
  getRelationshipsByTenant(
    @Param('tenantId') tenantId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10000;
    return this.dataService.getRelationshipsByTenant(tenantId, limitNum);
  }

  @Get('all')
  @ApiOperation({ 
    summary: 'Get all data (global)',
    description: 'Fetch all nodes and relationships in the entire database with complete schema information. Use with caution on large databases.'
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of records per type', example: 10000 })
  @ApiResponse({ status: 200, description: 'Returns complete graph data with nodes, relationships, schemas, and statistics' })
  getAllData(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10000;
    return this.dataService.getAllData(limitNum);
  }

  @Post('restore')
  @ApiOperation({
    summary: 'Restore graph from snapshot',
    description: 'Accepts the same payload shape returned by GET /api/data/all and upserts nodes/relationships. Intended for disaster recovery restore from source-of-truth exports.'
  })
  @ApiBody({
    schema: {
      example: {
        nodesByLabel: {
          Person: [
            {
              entityType: 'Person',
              entityId: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea',
              labels: ['Person', 'Student'],
              base: { label: 'Person', properties: { entity_id: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea', first_name: 'Sarah', last_name: 'Chen' } },
              subtypes: [{ label: 'Student', properties: { student_id: 'MIT-2019-001', gpa: 3.9 } }],
              unknownProperties: {},
            },
          ],
        },
        relationships: [
          {
            type: 'ENROLLED_IN',
            count: 1,
            relationships: [
              {
                type: 'ENROLLED_IN',
                tenant_id: 'tenant_mit',
                from: { entityId: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea' },
                to: { entityId: '8a9e24f4-c0d1-4c33-a4e5-b1e0f839d919' },
              },
            ],
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Snapshot restore completed with import statistics' })
  restoreAllData(@Body() payload: any) {
    return this.dataService.restoreAllData(payload);
  }
}

import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBody } from '@nestjs/swagger';
import { DataService } from './data.service';
import { TenantId } from '../auth/tenant.decorator';

@ApiTags('Data')
@Controller('data')
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get('tenant')
  @ApiOperation({ 
    summary: 'Get all nodes by tenant ID',
    description: 'Fetch all nodes connected to the tenant (from x-tenant-id header) with their properties and schema information. Properties are filtered to show only what belongs to each specific label.'
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of records per label', example: 10000 })
  @ApiResponse({ status: 200, description: 'Returns nodes grouped by label with schemas and statistics' })
  getNodesByTenant(
    @TenantId() tenantId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10000;
    return this.dataService.getAllNodesByTenant(tenantId, limitNum);
  }

  @Get('relationships/tenant')
  @ApiOperation({ 
    summary: 'Get all relationships by tenant ID',
    description: 'Fetch all relationships for the tenant (from x-tenant-id header), including source and target node data'
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of relationships', example: 10000 })
  @ApiResponse({ status: 200, description: 'Returns relationships grouped by type with statistics' })
  getRelationshipsByTenant(
    @TenantId() tenantId: string,
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
    description: 'Accepts the same payload shape returned by GET /api/data/all and upserts nodes/relationships. Use replace=true to delete any existing Entity nodes/relationships that are not present in the snapshot.'
  })
  @ApiQuery({ name: 'replace', required: false, description: 'When true, makes snapshot authoritative by deleting Entity nodes/relationships missing from the snapshot.', example: true })
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
  restoreAllData(
    @Body() payload: any,
    @Query('replace') replace?: string,
  ) {
    return this.dataService.restoreAllData(payload, {
      replace: this.parseBooleanQuery(replace),
    });
  }

  private parseBooleanQuery(value?: string): boolean {
    return value === '1' || value?.toLowerCase() === 'true';
  }
}

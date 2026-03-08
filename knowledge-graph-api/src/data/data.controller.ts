import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
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
}

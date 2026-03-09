import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { SchemaService } from './schema.service';

@ApiTags('Schema')
@Controller('schema')
export class SchemaController {
  constructor(private readonly schemaService: SchemaService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get full schema snapshot',
    description: 'Returns complete database schema including all node labels, relationship types, properties, and constraints'
  })
  @ApiQuery({
    name: 'includeInternal',
    required: false,
    type: Boolean,
    description: 'Include internal metadata labels (Entity, EntitySchema, SchemaProperty, PromotionSubtype, PromotionField)'
  })
  @ApiResponse({ status: 200, description: 'Full schema snapshot with typed properties' })
  getFullSchema(@Query('includeInternal') includeInternal?: string) {
    return this.schemaService.getFullSchema(this.parseBooleanQuery(includeInternal));
  }

  @Get('labels')
  @ApiOperation({ summary: 'Get all node labels', description: 'Returns list of all node labels in the database' })
  @ApiResponse({ status: 200, description: 'Array of label names' })
  getLabels() {
    return this.schemaService.getLabels();
  }

  @Get('labels/:label/properties')
  @ApiOperation({ 
    summary: 'Get properties for a label',
    description: 'Returns all properties and their types for a specific node label'
  })
  @ApiParam({ name: 'label', description: 'Node label name', example: 'Person' })
  @ApiResponse({ status: 200, description: 'Properties with types for the label' })
  getLabelProperties(@Param('label') label: string) {
    return this.schemaService.getPropertiesForLabel(label);
  }

  @Get('relationship-types')
  @ApiOperation({ summary: 'Get all relationship types', description: 'Returns list of all relationship types in the database' })
  @ApiResponse({ status: 200, description: 'Array of relationship type names' })
  getRelationshipTypes() {
    return this.schemaService.getRelationshipTypes();
  }

  @Get('relationship-types/:type/properties')
  @ApiOperation({ 
    summary: 'Get properties for a relationship type',
    description: 'Returns all properties and their types for a specific relationship type'
  })
  @ApiParam({ name: 'type', description: 'Relationship type name', example: 'WORKS_AT' })
  @ApiResponse({ status: 200, description: 'Properties with types for the relationship type' })
  getRelTypeProperties(@Param('type') type: string) {
    return this.schemaService.getPropertiesForRelType(type);
  }

  @Get('constraints')
  @ApiOperation({ summary: 'Get all constraints', description: 'Returns all database constraints (uniqueness, existence, etc.)' })
  @ApiResponse({ status: 200, description: 'Array of constraint definitions' })
  getConstraints() {
    return this.schemaService.getConstraints();
  }

  @Get('indexes')
  @ApiOperation({ summary: 'Get all indexes', description: 'Returns all database indexes for performance optimization' })
  @ApiResponse({ status: 200, description: 'Array of index definitions' })
  getIndexes() {
    return this.schemaService.getIndexes();
  }

  @Get('counts')
  @ApiOperation({ summary: 'Get node counts', description: 'Returns count of nodes for each label' })
  @ApiResponse({ status: 200, description: 'Array of labels with their node counts' })
  getCounts() {
    return this.schemaService.getCounts();
  }

  @Get('tenants')
  @ApiOperation({ summary: 'Get all tenant IDs', description: 'Returns list of all distinct tenant IDs found in relationships' })
  @ApiResponse({ status: 200, description: 'Array of tenant ID strings' })
  getTenants() {
    return this.schemaService.getTenants();
  }

  @Get('tenants/:tenantId/schema')
  @ApiOperation({ summary: 'Get schema for a tenant', description: 'Returns tenant-scoped schema details (node labels and relationship types) based on relationships with the given tenant_id.' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID', example: 'tenant_mit' })
  @ApiResponse({ status: 200, description: 'Tenant-scoped schema snapshot' })
  getSchemaForTenant(@Param('tenantId') tenantId: string) {
    return this.schemaService.getSchemaForTenant(tenantId);
  }

  private parseBooleanQuery(value?: string): boolean {
    return value === '1' || value?.toLowerCase() === 'true';
  }
}

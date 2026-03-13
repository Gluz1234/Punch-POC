import { Controller, Get, Put, Param, Query, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { SchemaService } from './schema.service';
import { TenantId } from '../auth/tenant.decorator';
import { PropertySecurityService } from '../auth/property-security.service';

@ApiTags('Schema')
@Controller('schema')
export class SchemaController {
  constructor(
    private readonly schemaService: SchemaService,
    private readonly propertySecurityService: PropertySecurityService,
  ) {}

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

  @Get('tenant')
  @ApiOperation({ summary: 'Get schema for a tenant', description: 'Returns tenant-scoped schema details (node labels and relationship types) using the tenant from x-tenant-id header.' })
  @ApiResponse({ status: 200, description: 'Tenant-scoped schema snapshot' })
  getSchemaForTenant(@TenantId() tenantId: string) {
    return this.schemaService.getSchemaForTenant(tenantId);
  }

  @Get('basetypes')
  @ApiOperation({ summary: 'Get all base types', description: 'List all configured base types and any custom base labels discovered from subtype definitions.' })
  @ApiResponse({ status: 200, description: 'Base types with subtype counts and totals' })
  getAllBaseTypes() {
    return this.schemaService.getAllBaseTypes();
  }

  @Get('subtypes')
  @ApiOperation({ summary: 'Get all subtype definitions', description: 'List all promotion subtype definitions across all base labels.' })
  @ApiResponse({ status: 200, description: 'Subtype definitions with total count' })
  getAllSubtypes() {
    return this.schemaService.getAllSubtypes();
  }

  // ── Property security levels ──────────────────────────────────────────────

  @Get('property-security')
  @ApiOperation({
    summary: 'Get all property security levels',
    description: 'Returns each SchemaProperty with its configured security level (1–6). Level 1 = open, 6 = highest restriction.',
  })
  @ApiResponse({ status: 200, description: 'Array of properties with their security levels' })
  getPropertySecurityLevels() {
    return this.propertySecurityService.getAllPropertyLevels();
  }

  @Put('property-security/:property')
  @ApiOperation({
    summary: 'Set security level for a property',
    description: 'Sets the security level (1–6) for a named SchemaProperty. GET requests from callers below this level will receive "[HIDDEN]" for the value. POST/PUT requests that include this property will be rejected with 403.',
  })
  @ApiParam({ name: 'property', description: 'Property name', example: 'salary_band' })
  @ApiBody({ schema: { example: { level: 5 } } })
  @ApiResponse({ status: 200, description: 'Number of SchemaProperty nodes updated' })
  setPropertySecurityLevel(
    @Param('property') property: string,
    @Body('level') level: number,
  ) {
    if (!level || level < 1 || level > 6) {
      throw new BadRequestException('level must be an integer between 1 and 6');
    }
    return this.propertySecurityService.setPropertyLevel(property, level);
  }

  private parseBooleanQuery(value?: string): boolean {
    return value === '1' || value?.toLowerCase() === 'true';
  }
}

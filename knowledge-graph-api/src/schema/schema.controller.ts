import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
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
  @ApiResponse({ status: 200, description: 'Full schema snapshot with typed properties' })
  getFullSchema() {
    return this.schemaService.getFullSchema();
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
}

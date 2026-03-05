import { Controller, Get, Param } from '@nestjs/common';
import { SchemaService } from './schema.service';

@Controller('schema')
export class SchemaController {
  constructor(private readonly schemaService: SchemaService) {}

  // GET /api/schema — full snapshot
  @Get()
  getFullSchema() {
    return this.schemaService.getFullSchema();
  }

  // GET /api/schema/labels
  @Get('labels')
  getLabels() {
    return this.schemaService.getLabels();
  }

  // GET /api/schema/labels/:label/properties
  @Get('labels/:label/properties')
  getLabelProperties(@Param('label') label: string) {
    return this.schemaService.getPropertiesForLabel(label);
  }

  // GET /api/schema/relationship-types
  @Get('relationship-types')
  getRelationshipTypes() {
    return this.schemaService.getRelationshipTypes();
  }

  // GET /api/schema/relationship-types/:type/properties
  @Get('relationship-types/:type/properties')
  getRelTypeProperties(@Param('type') type: string) {
    return this.schemaService.getPropertiesForRelType(type);
  }

  // GET /api/schema/constraints
  @Get('constraints')
  getConstraints() {
    return this.schemaService.getConstraints();
  }

  // GET /api/schema/indexes
  @Get('indexes')
  getIndexes() {
    return this.schemaService.getIndexes();
  }

  // GET /api/schema/counts
  @Get('counts')
  getCounts() {
    return this.schemaService.getCounts();
  }

  // GET /api/schema/tenants
  @Get('tenants')
  getTenants() {
    return this.schemaService.getTenants();
  }
}

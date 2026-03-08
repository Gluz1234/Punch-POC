import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PromotionsService, PromotionProjectionService } from './promotions.service';
import {
  PromotionSchemaService,
  PromotionSubtypeDefinitionDto,
} from './promotion-schema.service';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(
    private readonly promotionsService: PromotionsService,
    private readonly promotionProjection: PromotionProjectionService,
    private readonly promotionSchema: PromotionSchemaService,
  ) {}

  // ── Generic entity endpoints ────────────────────────────────────────────────

  @Get(':entityType/:entityId/labels')
  @ApiOperation({ summary: 'Get entity labels', description: 'Returns all labels for a specific entity (e.g. Person, Organization)' })
  @ApiParam({ name: 'entityType', description: 'Entity type key or label', example: 'person' })
  @ApiParam({ name: 'entityId', description: 'Entity ID value', example: 'person-sarah-chen' })
  @ApiResponse({ status: 200, description: 'Labels for the entity' })
  getLabels(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.promotionsService.getLabels(entityType, entityId);
  }

  @Get(':entityType/:entityId/typed-properties')
  @ApiOperation({ summary: 'Get typed properties', description: 'Returns properties grouped by base entity and subtype categories' })
  @ApiParam({ name: 'entityType', description: 'Entity type key or label', example: 'person' })
  @ApiParam({ name: 'entityId', description: 'Entity ID value', example: 'person-sarah-chen' })
  @ApiResponse({ status: 200, description: 'Properties organized by base and subtype categories' })
  getTypedProperties(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.promotionProjection.getEntityTypedProperties(entityType, entityId);
  }

  @Post(':entityType/:entityId/promote/:subtype')
  @ApiOperation({ summary: 'Promote entity to subtype', description: 'Add a subtype label and properties to any entity. Works for any entity type (person, organization, etc.) and any subtype (Student, Employee, or custom).' })
  @ApiParam({ name: 'entityType', description: 'Entity type key or label', example: 'person' })
  @ApiParam({ name: 'entityId', description: 'Entity ID value', example: 'person-sarah-chen' })
  @ApiParam({ name: 'subtype', description: 'Subtype label to add', example: 'Student' })
  @ApiBody({ schema: { example: { studentId: 'MIT-2019-001', gpa: 3.9, enrollmentYear: 2019 } } })
  @ApiResponse({ status: 201, description: 'Entity promoted to subtype successfully' })
  promoteToSubtype(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('subtype') subtype: string,
    @Body() properties: Record<string, any>,
  ) {
    return this.promotionsService.promoteToSubtype(entityType, entityId, subtype, properties);
  }

  // ── Generic listing ─────────────────────────────────────────────────────────

  @Get('list/:subtype')
  @ApiOperation({ summary: 'List nodes by subtype', description: 'Get all nodes with a given subtype label. Optionally filter by tenant ID.' })
  @ApiParam({ name: 'subtype', description: 'Subtype label', example: 'Student' })
  @ApiQuery({ name: 'tenantId', required: false, description: 'Optional tenant ID to filter by' })
  @ApiResponse({ status: 200, description: 'Array of nodes with the subtype label' })
  getNodesBySubtype(
    @Param('subtype') subtype: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.promotionsService.getNodesBySubtype(subtype, tenantId);
  }

  // ── Promotion schema (dynamic subtype definitions) ──────────────────────────

  @Post('schema/subtypes')
  @ApiOperation({ summary: 'Define/update a subtype', description: 'Create or update a promotion subtype definition and its fields at runtime' })
  @ApiBody({ schema: { example: { key: 'intern', label: 'Intern', baseLabel: 'Person', properties: ['intern_id', 'start_date', 'department'] } } })
  @ApiResponse({ status: 201, description: 'Subtype definition created/updated' })
  upsertSubtypeDefinition(@Body() dto: PromotionSubtypeDefinitionDto) {
    return this.promotionSchema.upsertSubtypeDefinition(dto);
  }

  @Get('schema/subtypes/:baseLabel')
  @ApiOperation({ summary: 'Get subtypes for a base label', description: 'List all subtype definitions that extend a given base label' })
  @ApiParam({ name: 'baseLabel', description: 'Base entity label', example: 'Person' })
  @ApiResponse({ status: 200, description: 'Array of subtype definitions' })
  getSubtypesForBase(@Param('baseLabel') baseLabel: string) {
    return this.promotionSchema.getSubtypeDefinitionsForBase(baseLabel);
  }

  @Get('schema/subtypes')
  @ApiOperation({ summary: 'Get all subtype definitions', description: 'List all subtype definitions across all base labels' })
  @ApiResponse({ status: 200, description: 'Array of all subtype definitions' })
  getAllSubtypes() {
    return this.promotionSchema.getAllSubtypeDefinitions();
  }
}

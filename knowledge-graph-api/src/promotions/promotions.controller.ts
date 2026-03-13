import { Controller, Get, Post, Put, Delete, Param, Body, Query, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { PromotionProjectionService } from './promotion-projection.service';
import {
  PromotionSchemaService,
  PromotionSubtypeDefinitionDto,
} from './promotion-schema.service';
import { TenantId } from '../auth/tenant.decorator';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(
    private readonly promotionsService: PromotionsService,
    private readonly promotionProjection: PromotionProjectionService,
    private readonly promotionSchema: PromotionSchemaService,
  ) {}

  // ── Generic entity endpoints ────────────────────────────────────────────────

  @Get(':entityId/labels')
  @ApiOperation({ summary: 'Get entity labels by ID', description: 'Returns all labels for an entity using only entity_id.' })
  @ApiParam({ name: 'entityId', description: 'Entity UUID (entity_id)', example: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea' })
  @ApiResponse({ status: 200, description: 'Labels for the entity' })
  getLabelsById(
    @Param('entityId') entityId: string,
  ) {
    return this.promotionsService.getLabelsById(entityId);
  }

  @Get(':entityType/:entityId/labels')
  @ApiOperation({ summary: 'Get entity labels (legacy route)', description: 'Backward-compatible route. entityType is validated against the entity labels and lookup is resolved by entity_id.' })
  @ApiParam({ name: 'entityType', description: 'Legacy entity type key or label', example: 'person' })
  @ApiParam({ name: 'entityId', description: 'Entity UUID (entity_id)', example: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea' })
  @ApiResponse({ status: 200, description: 'Labels for the entity' })
  getLabelsLegacy(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.promotionsService.getLabels(entityType, entityId);
  }

  @Get(':entityId/typed-properties')
  @ApiOperation({ summary: 'Get typed properties by ID', description: 'Returns properties grouped by base entity and subtype categories, filtered by the tenant from x-tenant-id header when present.' })
  @ApiParam({ name: 'entityId', description: 'Entity UUID (entity_id)', example: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea' })
  @ApiResponse({ status: 200, description: 'Properties organized by base and subtype categories' })
  getTypedPropertiesById(
    @Param('entityId') entityId: string,
    @TenantId() tenantId?: string,
  ) {
    if (tenantId) {
      return this.promotionProjection.getEntityTypedPropertiesByIdForTenant(entityId, tenantId);
    }
    return this.promotionProjection.getEntityTypedPropertiesById(entityId);
  }

  @Get(':entityType/:entityId/typed-properties')
  @ApiOperation({ summary: 'Get typed properties (legacy route)', description: 'Backward-compatible route. entityType is validated and lookup is resolved by entity_id. Tenant filtering uses x-tenant-id header when present.' })
  @ApiParam({ name: 'entityType', description: 'Legacy entity type key or label', example: 'person' })
  @ApiParam({ name: 'entityId', description: 'Entity UUID (entity_id)', example: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea' })
  @ApiResponse({ status: 200, description: 'Properties organized by base and subtype categories' })
  getTypedPropertiesLegacy(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @TenantId() tenantId?: string,
  ) {
    if (tenantId) {
      return this.promotionProjection.getEntityTypedPropertiesByIdForTenant(entityId, tenantId);
    }
    return this.promotionProjection.getEntityTypedProperties(entityType, entityId);
  }

  @Post(':entityId/promote/:subtype')
  @ApiOperation({ summary: 'Promote entity to subtype by ID', description: 'Add a subtype label and properties to any entity using only entity_id. Tenant is resolved from x-tenant-id header.' })
  @ApiParam({ name: 'entityId', description: 'Entity UUID (entity_id)', example: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea' })
  @ApiParam({ name: 'subtype', description: 'Subtype label to add', example: 'Student' })
  @ApiBody({ schema: { example: { studentId: 'MIT-2019-001', gpa: 3.9, enrollmentYear: 2019 } } })
  @ApiResponse({ status: 201, description: 'Entity promoted to subtype successfully' })
  promoteToSubtypeById(
    @Param('entityId') entityId: string,
    @Param('subtype') subtype: string,
    @TenantId() tenantId: string,
    @Body() properties: Record<string, any>,
  ) {
    return this.promotionsService.promoteToSubtypeById(entityId, subtype, properties, tenantId);
  }

  @Post(':entityType/:entityId/promote/:subtype')
  @ApiOperation({ summary: 'Promote entity to subtype (legacy route)', description: 'Backward-compatible route. entityType is validated and lookup is resolved by entity_id. Tenant from x-tenant-id header.' })
  @ApiParam({ name: 'entityType', description: 'Legacy entity type key or label', example: 'person' })
  @ApiParam({ name: 'entityId', description: 'Entity UUID (entity_id)', example: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea' })
  @ApiParam({ name: 'subtype', description: 'Subtype label to add', example: 'Student' })
  @ApiBody({ schema: { example: { studentId: 'MIT-2019-001', gpa: 3.9, enrollmentYear: 2019 } } })
  @ApiResponse({ status: 201, description: 'Entity promoted to subtype successfully' })
  promoteToSubtypeLegacy(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('subtype') subtype: string,
    @TenantId() tenantId: string,
    @Body() properties: Record<string, any>,
  ) {
    return this.promotionsService.promoteToSubtype(entityType, entityId, subtype, properties, tenantId);
  }

  // ── Subtype instance update / delete ────────────────────────────────────

  @Put(':entityId/subtype/:subtype')
  @ApiOperation({ summary: 'Update subtype instance properties', description: 'Update properties on a tenant-scoped SubtypeInstance. Tenant resolved from x-tenant-id header.' })
  @ApiParam({ name: 'entityId', description: 'Entity UUID (entity_id)', example: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea' })
  @ApiParam({ name: 'subtype', description: 'Subtype label', example: 'Student' })
  @ApiBody({ schema: { example: { gpa: 3.95, enrollmentYear: 2020 } } })
  @ApiResponse({ status: 200, description: 'Subtype instance updated' })
  updateSubtypeInstance(
    @Param('entityId') entityId: string,
    @Param('subtype') subtype: string,
    @TenantId() tenantId: string,
    @Body() properties: Record<string, any>,
  ) {
    return this.promotionsService.updateSubtypeInstance(entityId, subtype, tenantId, properties);
  }

  @Delete(':entityId/subtype/:subtype')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete subtype instance', description: 'Remove a tenant-scoped SubtypeInstance. Tenant resolved from x-tenant-id header.' })
  @ApiParam({ name: 'entityId', description: 'Entity UUID (entity_id)', example: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea' })
  @ApiParam({ name: 'subtype', description: 'Subtype label', example: 'Student' })
  @ApiResponse({ status: 200, description: 'Subtype instance deleted' })
  deleteSubtypeInstance(
    @Param('entityId') entityId: string,
    @Param('subtype') subtype: string,
    @TenantId() tenantId: string,
  ) {
    return this.promotionsService.deleteSubtypeInstance(entityId, subtype, tenantId);
  }

  // ── Generic listing ─────────────────────────────────────────────────────────

  @Get('list/:subtype')
  @ApiOperation({ summary: 'List nodes by subtype', description: 'Get all nodes with a given subtype label. Tenant filtering uses x-tenant-id header when present.' })
  @ApiParam({ name: 'subtype', description: 'Subtype label', example: 'Student' })
  @ApiResponse({ status: 200, description: 'Array of nodes with the subtype label' })
  getNodesBySubtype(
    @Param('subtype') subtype: string,
    @TenantId() tenantId?: string,
  ) {
    return this.promotionsService.getNodesBySubtype(subtype, tenantId);
  }

  // ── Promotion schema (dynamic subtype definitions) ──────────────────────────

  @Post('schema/subtypes')
  @ApiOperation({ summary: 'Define/update a subtype', description: 'Create or update a promotion subtype definition and its fields at runtime' })
  @ApiBody({ schema: { example: { key: 'intern', label: 'Intern', baseLabel: 'Person', icon: '🧑‍💼', allowedBaseLabels: ['Person'], properties: ['intern_id', 'start_date', 'department', 'hourly_rate'], propertyTypes: { intern_id: 'STRING', start_date: 'DATE', hourly_rate: 'FLOAT' } } } })
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

  @Get('schema/tenant/types')
  @ApiOperation({ summary: 'Get all types for a tenant', description: 'Returns all labels used by entities connected by tenant-scoped relationships (tenant from x-tenant-id header) and classifies them as base, subtype, or unknown.' })
  @ApiResponse({ status: 200, description: 'Tenant type inventory' })
  getTypesByTenant(
    @TenantId() tenantId: string,
  ) {
    return this.promotionsService.getTypesByTenant(tenantId);
  }
}

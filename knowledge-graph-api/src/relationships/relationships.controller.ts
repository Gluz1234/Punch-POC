import { Controller, Get, Post, Delete, Param, Body, Query, HttpCode, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { RelationshipsService } from './relationships.service';
import { TenantId } from '../auth/tenant.decorator';

@ApiTags('Relationships')
@Controller('relationships')
export class RelationshipsController {
  constructor(private readonly relationshipsService: RelationshipsService) {}

  // ── Tenant-wide relationship listing ─────────────────────────────────────

  @Get('tenant')
  @ApiOperation({
    summary: 'Get all relationships by tenant ID',
    description: 'Returns all relationships scoped to the tenant (from x-tenant-id header), grouped by relationship type.',
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of relationships', example: 10000 })
  @ApiResponse({ status: 200, description: 'Relationships grouped by type with statistics' })
  getRelationshipsByTenant(
    @TenantId() tenantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.relationshipsService.getRelationshipsByTenant(
      tenantId,
      limit ? parseInt(limit, 10) : 10000,
    );
  }

  // ── Generic entity relationship listing ───────────────────────────────────

  @Get(':entityId')
  @ApiOperation({ summary: 'Get all relationships by entity ID', description: 'Returns all outgoing relationships for an entity using only entity_id (type is not required). Tenant filtering uses x-tenant-id header when present.' })
  @ApiParam({ name: 'entityId', description: 'Entity UUID (entity_id)', example: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea' })
  @ApiResponse({ status: 200, description: 'List of relationships' })
  getEntityRelationshipsById(
    @Param('entityId') entityId: string,
    @TenantId() tenantId?: string,
  ) {
    return this.relationshipsService.getEntityRelationships(entityId, tenantId);
  }

  @Get(':entityType/:entityId')
  @ApiOperation({ summary: 'Get all relationships (legacy route)', description: 'Backward-compatible route. entityType is ignored and relationships are resolved by entity_id only. Tenant filtering uses x-tenant-id header when present.' })
  @ApiParam({ name: 'entityType', description: 'Legacy entity type key (ignored)', example: 'person' })
  @ApiParam({ name: 'entityId', description: 'Entity UUID (entity_id)', example: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea' })
  @ApiResponse({ status: 200, description: 'List of relationships' })
  getEntityRelationshipsLegacy(
    @Param('entityType') _entityType: string,
    @Param('entityId') entityId: string,
    @TenantId() tenantId?: string,
  ) {
    return this.relationshipsService.getEntityRelationships(entityId, tenantId);
  }

  // ── Generic create relationship ───────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a relationship between any two entities', description: 'Dynamically creates a relationship of any type between any two entity types with tenant scope' })
  @ApiBody({
    schema: {
      example: {
        sourceId: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea',
        targetId: 'f2c7e45c-9fcc-4ed3-b966-b75bbeca57ff',
        relationshipType: 'ENROLLED_IN',
        tenantId: 'tenant_mit',
        properties: { program: 'BSc Computer Science', start_date: '2024-09-01' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Relationship created successfully' })
  createRelationship(@Body() dto: any, @TenantId() tenantId: string, @Request() req: any) {
    return this.relationshipsService.createRelationship({ ...dto, tenantId });
  }

  // ── Generic delete relationship ───────────────────────────────────────────

  // Delete ALL tenant-scoped relationships on an entity (literal 'all' route must come first)
  @Delete(':entityId/all')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Delete all tenant relationships for an entity',
    description:
      'Deletes every relationship (incoming and outgoing) on the given entity that belongs to the tenant (from x-tenant-id header).',
  })
  @ApiParam({
    name: 'entityId',
    description: 'Entity UUID (entity_id)',
    example: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea',
  })
  @ApiResponse({
    status: 200,
    description: 'All tenant-scoped relationships for the entity deleted',
  })
  deleteAllEntityRelationshipsForTenant(
    @Param('entityId') entityId: string,
    @TenantId() tenantId: string,
  ) {
    return this.relationshipsService.deleteAllEntityRelationshipsForTenant(
      entityId,
      tenantId,
    );
  }

  @Delete(':sourceId/:relationshipType')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a relationship by IDs', description: 'Deletes relationships by source entity_id and relationship type. Tenant resolved from x-tenant-id header. Optionally specify targetId.' })
  @ApiParam({ name: 'sourceId', description: 'Source entity UUID (entity_id)', example: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea' })
  @ApiParam({ name: 'relationshipType', description: 'Relationship type', example: 'ENROLLED_IN' })
  @ApiQuery({ name: 'targetId', required: false, description: 'Target entity UUID (optional, narrows delete)' })
  @ApiResponse({ status: 200, description: 'Relationship deleted' })
  deleteRelationshipById(
    @Param('sourceId') sourceId: string,
    @Param('relationshipType') relationshipType: string,
    @TenantId() tenantId: string,
    @Query('targetId') targetId?: string,
  ) {
    return this.relationshipsService.deleteRelationship({
      sourceId,
      relationshipType,
      tenantId,
      targetId,
    });
  }

  @Delete(':sourceType/:sourceId/:relationshipType')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a relationship (legacy route)', description: 'Backward-compatible route. sourceType/targetType are ignored and deletion is resolved by entity_id. Tenant from x-tenant-id header.' })
  @ApiParam({ name: 'sourceType', description: 'Legacy source type (ignored)', example: 'person' })
  @ApiParam({ name: 'sourceId', description: 'Source entity UUID (entity_id)', example: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea' })
  @ApiParam({ name: 'relationshipType', description: 'Relationship type', example: 'ENROLLED_IN' })
  @ApiQuery({ name: 'targetType', required: false, description: 'Legacy target type (ignored)' })
  @ApiQuery({ name: 'targetId', required: false, description: 'Target entity UUID (optional, narrows delete)' })
  @ApiResponse({ status: 200, description: 'Relationship deleted' })
  deleteRelationshipLegacy(
    @Param('sourceType') _sourceType: string,
    @Param('sourceId') sourceId: string,
    @Param('relationshipType') relationshipType: string,
    @TenantId() tenantId: string,
    @Query('targetType') _targetType?: string,
    @Query('targetId') targetId?: string,
  ) {
    return this.relationshipsService.deleteRelationship({
      sourceType: _sourceType,
      sourceId,
      relationshipType,
      tenantId,
      targetId,
    });
  }
}

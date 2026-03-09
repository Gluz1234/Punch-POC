import { Controller, Get, Post, Delete, Param, Body, Query, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { RelationshipsService } from './relationships.service';

@ApiTags('Relationships')
@Controller('relationships')
export class RelationshipsController {
  constructor(private readonly relationshipsService: RelationshipsService) {}

  // ── Tenant-wide relationship listing ─────────────────────────────────────

  @Get('tenant/:tenantId')
  @ApiOperation({
    summary: 'Get all relationships by tenant ID',
    description: 'Returns all relationships scoped to a tenant, grouped by relationship type.',
  })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID', example: 'tenant_mit' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of relationships', example: 10000 })
  @ApiResponse({ status: 200, description: 'Relationships grouped by type with statistics' })
  getRelationshipsByTenant(
    @Param('tenantId') tenantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.relationshipsService.getRelationshipsByTenant(
      tenantId,
      limit ? parseInt(limit, 10) : 10000,
    );
  }

  // ── Generic entity relationship listing ───────────────────────────────────

  @Get(':entityId')
  @ApiOperation({ summary: 'Get all relationships by entity ID', description: 'Returns all outgoing relationships for an entity using only entity_id (type is not required).' })
  @ApiParam({ name: 'entityId', description: 'Entity UUID (entity_id)', example: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea' })
  @ApiQuery({ name: 'tenantId', required: false, description: 'Optional tenant ID to filter by' })
  @ApiResponse({ status: 200, description: 'List of relationships' })
  getEntityRelationshipsById(
    @Param('entityId') entityId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.relationshipsService.getEntityRelationships(entityId, tenantId);
  }

  @Get(':entityType/:entityId')
  @ApiOperation({ summary: 'Get all relationships (legacy route)', description: 'Backward-compatible route. entityType is ignored and relationships are resolved by entity_id only.' })
  @ApiParam({ name: 'entityType', description: 'Legacy entity type key (ignored)', example: 'person' })
  @ApiParam({ name: 'entityId', description: 'Entity UUID (entity_id)', example: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea' })
  @ApiQuery({ name: 'tenantId', required: false, description: 'Optional tenant ID to filter by' })
  @ApiResponse({ status: 200, description: 'List of relationships' })
  getEntityRelationshipsLegacy(
    @Param('entityType') _entityType: string,
    @Param('entityId') entityId: string,
    @Query('tenantId') tenantId?: string,
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
  createRelationship(@Body() dto: any) {
    return this.relationshipsService.createRelationship(dto);
  }

  // ── Generic delete relationship ───────────────────────────────────────────

  @Delete(':sourceId/:relationshipType/:tenantId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a relationship by IDs', description: 'Deletes relationships by source entity_id, relationship type, and tenant. Optionally specify targetId.' })
  @ApiParam({ name: 'sourceId', description: 'Source entity UUID (entity_id)', example: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea' })
  @ApiParam({ name: 'relationshipType', description: 'Relationship type', example: 'ENROLLED_IN' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID', example: 'tenant_mit' })
  @ApiQuery({ name: 'targetId', required: false, description: 'Target entity UUID (optional, narrows delete)' })
  @ApiResponse({ status: 200, description: 'Relationship deleted' })
  deleteRelationshipById(
    @Param('sourceId') sourceId: string,
    @Param('relationshipType') relationshipType: string,
    @Param('tenantId') tenantId: string,
    @Query('targetId') targetId?: string,
  ) {
    return this.relationshipsService.deleteRelationship({
      sourceId,
      relationshipType,
      tenantId,
      targetId,
    });
  }

  @Delete(':sourceType/:sourceId/:relationshipType/:tenantId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a relationship (legacy route)', description: 'Backward-compatible route. sourceType/targetType are ignored and deletion is resolved by entity_id.' })
  @ApiParam({ name: 'sourceType', description: 'Legacy source type (ignored)', example: 'person' })
  @ApiParam({ name: 'sourceId', description: 'Source entity UUID (entity_id)', example: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea' })
  @ApiParam({ name: 'relationshipType', description: 'Relationship type', example: 'ENROLLED_IN' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID', example: 'tenant_mit' })
  @ApiQuery({ name: 'targetType', required: false, description: 'Legacy target type (ignored)' })
  @ApiQuery({ name: 'targetId', required: false, description: 'Target entity UUID (optional, narrows delete)' })
  @ApiResponse({ status: 200, description: 'Relationship deleted' })
  deleteRelationshipLegacy(
    @Param('sourceType') _sourceType: string,
    @Param('sourceId') sourceId: string,
    @Param('relationshipType') relationshipType: string,
    @Param('tenantId') tenantId: string,
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

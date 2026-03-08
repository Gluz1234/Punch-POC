import { Controller, Get, Post, Delete, Param, Body, Query, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { RelationshipsService } from './relationships.service';

@ApiTags('Relationships')
@Controller('relationships')
export class RelationshipsController {
  constructor(private readonly relationshipsService: RelationshipsService) {}

  // ── Generic entity relationship listing ───────────────────────────────────

  @Get(':entityType/:entityId')
  @ApiOperation({ summary: 'Get all relationships for any entity', description: 'Returns all outgoing relationships for any entity type (person, organization, skill, etc.)' })
  @ApiParam({ name: 'entityType', description: 'Entity type key (e.g. person, organization, skill)', example: 'person' })
  @ApiParam({ name: 'entityId', description: 'Entity ID value', example: 'person-sarah-chen' })
  @ApiQuery({ name: 'tenantId', required: false, description: 'Optional tenant ID to filter by' })
  @ApiResponse({ status: 200, description: 'List of relationships' })
  getEntityRelationships(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.relationshipsService.getEntityRelationships(entityType, entityId, tenantId);
  }

  // ── Generic create relationship ───────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a relationship between any two entities', description: 'Dynamically creates a relationship of any type between any two entity types with tenant scope' })
  @ApiBody({
    schema: {
      example: {
        sourceType: 'person',
        sourceId: 'person-sarah-chen',
        targetType: 'organization',
        targetId: 'org-mit',
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

  @Delete(':sourceType/:sourceId/:relationshipType/:tenantId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a relationship', description: 'Deletes a relationship by source entity, relationship type, and tenant. Optionally specify target to narrow.' })
  @ApiParam({ name: 'sourceType', description: 'Source entity type', example: 'person' })
  @ApiParam({ name: 'sourceId', description: 'Source entity ID', example: 'person-sarah-chen' })
  @ApiParam({ name: 'relationshipType', description: 'Relationship type', example: 'ENROLLED_IN' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID', example: 'tenant_mit' })
  @ApiQuery({ name: 'targetType', required: false, description: 'Target entity type (optional, narrows delete)' })
  @ApiQuery({ name: 'targetId', required: false, description: 'Target entity ID (optional, narrows delete)' })
  @ApiResponse({ status: 200, description: 'Relationship deleted' })
  deleteRelationship(
    @Param('sourceType') sourceType: string,
    @Param('sourceId') sourceId: string,
    @Param('relationshipType') relationshipType: string,
    @Param('tenantId') tenantId: string,
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
  ) {
    return this.relationshipsService.deleteRelationship({
      sourceType,
      sourceId,
      relationshipType,
      tenantId,
      targetType,
      targetId,
    });
  }
}

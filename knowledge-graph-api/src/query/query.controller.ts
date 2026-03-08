import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { QueryService } from './query.service';

@ApiTags('Queries')
@Controller('query')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  // ── Generic: entities connected by relationship ───────────────────────────

  @Get(':sourceType/by-relationship/:relationshipType/:targetType/:targetId')
  @ApiOperation({
    summary: 'Find entities by relationship',
    description: 'Find all entities of sourceType connected to a specific target by the given relationship type. E.g. GET /query/person/by-relationship/WORKS_AT/organization/org-mit?tenantId=tenant_mit',
  })
  @ApiParam({ name: 'sourceType', description: 'Source entity type', example: 'person' })
  @ApiParam({ name: 'relationshipType', description: 'Relationship type', example: 'WORKS_AT' })
  @ApiParam({ name: 'targetType', description: 'Target entity type', example: 'organization' })
  @ApiParam({ name: 'targetId', description: 'Target entity ID', example: 'org-mit' })
  @ApiQuery({ name: 'tenantId', required: false, description: 'Optional tenant ID filter' })
  @ApiResponse({ status: 200, description: 'List of matching entities with relationship properties' })
  entitiesByRelationship(
    @Param('sourceType') sourceType: string,
    @Param('relationshipType') relationshipType: string,
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.queryService.getEntitiesByRelationship(
      sourceType, targetType, relationshipType, targetId, tenantId,
    );
  }

  // ── Generic: cross-tenant query ───────────────────────────────────────────

  @Get('cross/:entityType/:relationshipType')
  @ApiOperation({
    summary: 'Cross-tenant entity query',
    description: 'Find entities connected to two different targets across two tenants via the same relationship type',
  })
  @ApiParam({ name: 'entityType', description: 'Entity type', example: 'person' })
  @ApiParam({ name: 'relationshipType', description: 'Relationship type', example: 'WORKS_AT' })
  @ApiQuery({ name: 'targetTypeA', required: true, description: 'Target type A', example: 'organization' })
  @ApiQuery({ name: 'targetIdA', required: true, description: 'Target ID A', example: 'org-mit' })
  @ApiQuery({ name: 'tenantA', required: true, description: 'Tenant A', example: 'tenant_mit' })
  @ApiQuery({ name: 'targetTypeB', required: true, description: 'Target type B', example: 'organization' })
  @ApiQuery({ name: 'targetIdB', required: true, description: 'Target ID B', example: 'org-google' })
  @ApiQuery({ name: 'tenantB', required: true, description: 'Tenant B', example: 'tenant_google' })
  @ApiResponse({ status: 200, description: 'Entities matching both connections' })
  crossTenantQuery(
    @Param('entityType') entityType: string,
    @Param('relationshipType') relationshipType: string,
    @Query('targetTypeA') targetTypeA: string,
    @Query('targetIdA') targetIdA: string,
    @Query('tenantA') tenantA: string,
    @Query('targetTypeB') targetTypeB: string,
    @Query('targetIdB') targetIdB: string,
    @Query('tenantB') tenantB: string,
  ) {
    return this.queryService.getCrossTenantEntities(
      entityType, relationshipType,
      targetTypeA, targetIdA, tenantA,
      targetTypeB, targetIdB, tenantB,
    );
  }

  // ── Generic: tenants for entity ───────────────────────────────────────────

  @Get('tenants-for/:entityType/:entityId')
  @ApiOperation({ summary: 'Get tenant IDs for any entity', description: 'Returns all distinct tenant IDs from relationships of the given entity' })
  @ApiParam({ name: 'entityType', description: 'Entity type key or label', example: 'person' })
  @ApiParam({ name: 'entityId', description: 'Entity ID value', example: 'person-sarah-chen' })
  @ApiResponse({ status: 200, description: 'Array of tenant IDs' })
  tenantsForEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.queryService.getTenantsForEntity(entityType, entityId);
  }

  // ── Generic: nodes by label ───────────────────────────────────────────────

  @Get('nodes-by-label/:label')
  @ApiOperation({ summary: 'Get nodes by label', description: 'Returns all nodes that carry the given label, optionally filtered by tenant' })
  @ApiParam({ name: 'label', description: 'Node label to search for', example: 'Student' })
  @ApiQuery({ name: 'tenantId', required: false, description: 'Optional tenant ID filter' })
  @ApiResponse({ status: 200, description: 'Array of matching nodes' })
  nodesByLabel(
    @Param('label') label: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.queryService.getNodesByLabel(label, tenantId);
  }
}

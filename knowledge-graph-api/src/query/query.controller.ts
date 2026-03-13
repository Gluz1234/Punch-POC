import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { QueryService } from './query.service';
import { TenantId } from '../auth/tenant.decorator';

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
  @ApiResponse({ status: 200, description: 'List of matching entities with relationship properties' })
  entitiesByRelationship(
    @Param('sourceType') sourceType: string,
    @Param('relationshipType') relationshipType: string,
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
    @TenantId() tenantId?: string,
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

  @Get('tenants-for/:entityId')
  @ApiOperation({ summary: 'Get tenant IDs by entity ID', description: 'Returns all distinct tenant IDs from relationships of the given entity_id.' })
  @ApiParam({ name: 'entityId', description: 'Entity UUID (entity_id)', example: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea' })
  @ApiResponse({ status: 200, description: 'Array of tenant IDs' })
  tenantsForEntityById(
    @Param('entityId') entityId: string,
  ) {
    return this.queryService.getTenantsForEntity(entityId);
  }

  @Get('tenants-for/:entityType/:entityId')
  @ApiOperation({ summary: 'Get tenant IDs for any entity (legacy route)', description: 'Backward-compatible route. entityType is ignored and lookup is resolved by entity_id.' })
  @ApiParam({ name: 'entityType', description: 'Legacy entity type key (ignored)', example: 'person' })
  @ApiParam({ name: 'entityId', description: 'Entity UUID (entity_id)', example: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea' })
  @ApiResponse({ status: 200, description: 'Array of tenant IDs' })
  tenantsForEntityLegacy(
    @Param('entityType') _entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.queryService.getTenantsForEntity(entityId);
  }

  // ── Generic: nodes by label ───────────────────────────────────────────────

  @Get('nodes-by-label/:label')
  @ApiOperation({ summary: 'Get nodes by label', description: 'Returns all nodes that carry the given label, optionally filtered by tenant' })
  @ApiParam({ name: 'label', description: 'Node label to search for', example: 'Student' })
  @ApiResponse({ status: 200, description: 'Array of matching nodes' })
  nodesByLabel(
    @Param('label') label: string,
    @TenantId() tenantId?: string,
  ) {
    return this.queryService.getNodesByLabel(label, tenantId);
  }
}

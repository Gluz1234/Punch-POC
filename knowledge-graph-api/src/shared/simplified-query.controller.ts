import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { SimplifiedQueryService, SimplifiedQueryConfig } from './simplified-query.service';

/**
 * Simplified Query Controller
 * 
 * Provides intuitive, minimal API for common query patterns.
 * Clients send simple JSON instead of complex configs.
 * 
 * Much simpler than the generic query builder!
 */
@Controller('search')
export class SimplifiedQueryController {
  constructor(private readonly queryService: SimplifiedQueryService) {}

  /**
   * POST /search
   * Execute a simplified query.
   * 
   * Example:
   * ```json
   * {
   *   "entity": "person",
   *   "relationships": [
   *     { "type": "WORKS_AT", "target": "organization", "filters": { "org_id": "ORG_123" } }
   *   ],
   *   "tenantId": "TENANT_1",
   *   "limit": 50
   * }
   * ```
   */
  @Post()
  @HttpCode(200)
  async search(@Body() config: SimplifiedQueryConfig) {
    return this.queryService.execute(config);
  }

  /**
   * POST /search/persons
   * Get all persons (with optional tenant scoping).
   * 
   * Body: { "tenantId": "TENANT_1", "limit": 50 }
   */
  @Post('persons')
  @HttpCode(200)
  async getPersons(
    @Body() dto: { tenantId?: string; limit?: number },
  ) {
    return this.queryService.getPersons(dto.tenantId, dto.limit);
  }

  /**
   * POST /search/persons-at-org
   * Get persons working at organization.
   * 
   * Body: { "orgId": "ORG_123", "tenantId": "TENANT_1", "limit": 50 }
   */
  @Post('persons-at-org')
  @HttpCode(200)
  async getPersonsAtOrg(
    @Body() dto: { orgId: string; tenantId: string; limit?: number },
  ) {
    return this.queryService.getPersonsAtOrg(dto.orgId, dto.tenantId, dto.limit);
  }

  /**
   * POST /search/persons-enrolled-at
   * Get persons enrolled at organization.
   * 
   * Body: { "orgId": "ORG_123", "tenantId": "TENANT_1", "limit": 50 }
   */
  @Post('persons-enrolled-at')
  @HttpCode(200)
  async getPersonsEnrolledAt(
    @Body() dto: { orgId: string; tenantId: string; limit?: number },
  ) {
    return this.queryService.getPersonsEnrolledAt(dto.orgId, dto.tenantId, dto.limit);
  }

  /**
   * POST /search/persons-with-skill
   * Get persons who have a specific skill.
   * 
   * Body: { "skillId": "JAVA", "tenantId": "TENANT_1", "limit": 50 }
   */
  @Post('persons-with-skill')
  @HttpCode(200)
  async getPersonsWithSkill(
    @Body() dto: { skillId: string; tenantId?: string; limit?: number },
  ) {
    return this.queryService.getPersonsWithSkill(dto.skillId, dto.tenantId, dto.limit);
  }

  /**
   * POST /search/person-profile
   * Get complete profile for a person (all relationships).
   * 
   * Body: { "personId": "P_123", "tenantId": "TENANT_1" }
   */
  @Post('person-profile')
  @HttpCode(200)
  async getPersonProfile(
    @Body() dto: { personId: string; tenantId: string },
  ) {
    return this.queryService.getPersonMultipleRelationships(dto.personId, dto.tenantId);
  }
}

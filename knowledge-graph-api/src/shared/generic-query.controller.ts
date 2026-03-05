import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { GenericQueryService, QueryBuilderConfig } from './generic-query.service';

/**
 * Generic Query Controller
 * 
 * Allows API clients to build and execute complex Neo4j queries dynamically
 * without requiring hardcoded endpoints for each query pattern.
 * 
 * Example POST body:
 * ```json
 * {
 *   "mainEntity": {
 *     "config": { "label": "Person", "idField": "strong_id" },
 *     "alias": "p"
 *   },
 *   "relationships": [
 *     {
 *       "type": "WORKS_AT",
 *       "direction": "->",
 *       "targetEntity": {
 *         "config": { "label": "Organization", "idField": "org_id" },
 *         "alias": "o",
 *         "filterFields": { "org_id": "ORG_123" }
 *       }
 *     }
 *   ],
 *   "returns": ["p", "o.name AS orgName"],
 *   "tenantId": "TENANT_1",
 *   "limit": 100
 * }
 * ```
 */
@Controller('query')
export class GenericQueryController {
  constructor(private readonly queryService: GenericQueryService) {}

  /**
   * POST /query/execute
   * Execute a dynamically built query without hardcoding.
   * 
   * This replaces the need to define specialized methods like:
   * - getPersonsWorkingAtOrg()
   * - getPersonsEnrolledInOrg()
   * - getPersonsWithMultipleEmployers()
   * 
   * All are now possible via a single dynamic endpoint.
   */
  @Post('execute')
  @HttpCode(200)
  async executeQuery(@Body() config: QueryBuilderConfig) {
    return this.queryService.execute(config);
  }

  /**
   * POST /query/persons-working-at-org
   * Convenience endpoint: Persons working at a specific organization.
   */
  @Post('persons-working-at-org')
  @HttpCode(200)
  async getPersonsWorkingAtOrg(@Body() dto: { orgId: string; tenantId: string }) {
    return this.queryService.getPersonsWorkingAtOrg(dto.orgId, dto.tenantId);
  }

  /**
   * POST /query/persons-enrolled-in-org
   * Convenience endpoint: Persons enrolled in a specific organization.
   */
  @Post('persons-enrolled-in-org')
  @HttpCode(200)
  async getPersonsEnrolledInOrg(@Body() dto: { orgId: string; tenantId: string }) {
    return this.queryService.getPersonsEnrolledInOrg(dto.orgId, dto.tenantId);
  }

  /**
   * POST /query/persons-with-multiple-roles
   * Convenience endpoint: Person with both work and enrollment relationships.
   */
  @Post('persons-with-multiple-roles')
  @HttpCode(200)
  async getPersonsWithMultipleRoles(
    @Body() dto: { personId: string; tenantId: string },
  ) {
    return this.queryService.getPersonsWithMultipleRoles(dto.personId, dto.tenantId);
  }
}

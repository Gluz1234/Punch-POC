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

  @Post('execute')
  @HttpCode(200)
  async executeQuery(@Body() config: QueryBuilderConfig) {
    return this.queryService.execute(config);
  }
}

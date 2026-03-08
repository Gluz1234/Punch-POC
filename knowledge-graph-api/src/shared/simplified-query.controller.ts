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

  @Post()
  @HttpCode(200)
  async search(@Body() config: SimplifiedQueryConfig) {
    return this.queryService.execute(config);
  }
}

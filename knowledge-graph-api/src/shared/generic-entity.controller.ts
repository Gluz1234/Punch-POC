import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
} from '@nestjs/common';
import { GenericEntityService } from '../shared/generic-entity.service';
import { EntityConfig } from '../shared/entity-config';

/**
 * Generic Entity Controller
 * Handles CRUD operations for any entity type via dependency injection of EntityConfig.
 * 
 * This single controller replaces 13+ hardcoded controllers.
 */
export function createGenericEntityController(
  config: EntityConfig,
): ConstructorFunction {
  @Controller(config.route)
  class GenericEntityController {
    constructor(private readonly service: GenericEntityService) {}

    /**
     * POST /:route
     * Create or upsert an entity.
     */
    @Post()
    create(@Body() dto: any) {
      return this.service.upsert(config, dto);
    }

    /**
     * GET /:route
     * Get all entities of this type.
     */
    @Get()
    findAll(@Query('limit') limit?: string) {
      return this.service.findAll(config, limit ? parseInt(limit, 10) : 1000);
    }

    /**
     * GET /:route/:id
     * Get a single entity by ID.
     */
    @Get(':id')
    findOne(@Param('id') id: string) {
      return this.service.findOne(config, id);
    }

    /**
     * PUT /:route/:id
     * Update an entity.
     */
    @Put(':id')
    update(@Param('id') id: string, @Body() dto: any) {
      return this.service.update(config, id, dto);
    }

    /**
     * DELETE /:route/:id
     * Delete an entity.
     */
    @Delete(':id')
    @HttpCode(200)
    remove(@Param('id') id: string) {
      return this.service.remove(config, id);
    }

    /**
     * GET /:route/by-:property/:value
     * Filter by a specific property (e.g., /courses/by-org/org-mit).
     * This is a catch-all for special queries defined in the entity config.
     */
    @Get('by-:property/:value')
    findByProperty(
      @Param('property') property: string,
      @Param('value') value: string,
      @Query('limit') limit?: string,
    ) {
      // Check if this property is defined in special queries
      const specialQuery = config.specialQueries?.find(
        q => q.name === property,
      );
      if (!specialQuery) {
        throw new Error(
          `Unknown filter: ${property}. Available filters: ${
            config.specialQueries?.map(q => q.name).join(', ') || 'none'
          }`,
        );
      }

      return this.service.findBy(
        config,
        specialQuery.cypherParam,
        value,
        limit ? parseInt(limit, 10) : 1000,
      );
    }
  }

  Object.defineProperty(GenericEntityController, 'name', {
    value: `${config.label}Controller`,
  });

  return GenericEntityController as unknown as ConstructorFunction;
}

type ConstructorFunction = new (...args: any[]) => any;

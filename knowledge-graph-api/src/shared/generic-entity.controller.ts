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
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
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
  @ApiTags('Entities')
  @Controller(config.route)
  class GenericEntityController {
    constructor(private readonly service: GenericEntityService) {}

    @Post()
    @ApiOperation({ 
      summary: `Create ${config.displayName}`,
      description: `Create or upsert a ${config.displayName} entity. Uses MERGE on ${config.idField} for uniqueness.`
    })
    @ApiBody({ description: `${config.displayName} data` })
    @ApiResponse({ status: 201, description: `${config.displayName} created/updated successfully` })
    create(@Body() dto: any) {
      return this.service.upsert(config, dto);
    }

    @Get()
    @ApiOperation({ 
      summary: `Get all ${config.displayName}s`,
      description: `Returns list of all ${config.displayName} entities`
    })
    @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of results', example: 1000 })
    @ApiResponse({ status: 200, description: `List of ${config.displayName}s` })
    findAll(@Query('limit') limit?: string) {
      return this.service.findAll(config, limit ? parseInt(limit, 10) : 1000);
    }

    @Get(':id')
    @ApiOperation({ 
      summary: `Get ${config.displayName} by ID`,
      description: `Returns a single ${config.displayName} by its ${config.idField}`
    })
    @ApiParam({ name: 'id', description: config.idField })
    @ApiResponse({ status: 200, description: `${config.displayName} found` })
    @ApiResponse({ status: 404, description: `${config.displayName} not found` })
    findOne(@Param('id') id: string) {
      return this.service.findOne(config, id);
    }

    @Put(':id')
    @ApiOperation({ 
      summary: `Update ${config.displayName}`,
      description: `Update a ${config.displayName} entity by ID`
    })
    @ApiParam({ name: 'id', description: config.idField })
    @ApiBody({ description: `Updated ${config.displayName} data` })
    @ApiResponse({ status: 200, description: `${config.displayName} updated successfully` })
    update(@Param('id') id: string, @Body() dto: any) {
      return this.service.update(config, id, dto);
    }

    @Delete(':id')
    @HttpCode(200)
    @ApiOperation({ 
      summary: `Delete ${config.displayName}`,
      description: `Delete a ${config.displayName} entity by ID`
    })
    @ApiParam({ name: 'id', description: config.idField })
    @ApiResponse({ status: 200, description: `${config.displayName} deleted successfully` })
    remove(@Param('id') id: string) {
      return this.service.remove(config, id);
    }

    @Get('by-:property/:value')
    @ApiOperation({ 
      summary: `Filter ${config.displayName}s by property`,
      description: `Get ${config.displayName}s filtered by a specific property value`
    })
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

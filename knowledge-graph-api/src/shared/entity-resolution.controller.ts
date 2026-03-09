import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EntityResolutionService } from './entity-resolution.service';

@ApiTags('Identity Resolution')
@Controller('identity')
export class EntityResolutionController {
  constructor(private readonly resolutionService: EntityResolutionService) {}

  @Get(':entityId/canonical')
  @ApiOperation({ summary: 'Resolve canonical entity_id', description: 'Follow MERGED_INTO links and return the canonical entity_id for any entity alias.' })
  @ApiParam({ name: 'entityId', description: 'Entity UUID (entity_id)' })
  @ApiResponse({ status: 200, description: 'Canonical resolution details' })
  resolveCanonical(@Param('entityId') entityId: string) {
    return this.resolutionService.resolveCanonicalEntityId(entityId);
  }

  @Get(':entityId/possible-duplicates')
  @ApiOperation({ summary: 'Suggest possible duplicates for an entity', description: 'Scores likely duplicates using email/phone/name/code/title signals.' })
  @ApiParam({ name: 'entityId', description: 'Entity UUID (entity_id)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum suggestions to return', example: 5 })
  @ApiResponse({ status: 200, description: 'Possible duplicate list' })
  async possibleDuplicates(
    @Param('entityId') entityId: string,
    @Query('limit') limit?: string,
  ) {
    const max = limit ? parseInt(limit, 10) : 5;
    return {
      entityId,
      suggestions: await this.resolutionService.getPossibleDuplicates(entityId, max),
    };
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge duplicate entities', description: 'Create a canonical identity mapping from duplicate entity to primary entity.' })
  @ApiBody({
    schema: {
      example: {
        primaryEntityId: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea',
        duplicateEntityId: 'f2c7e45c-9fcc-4ed3-b966-b75bbeca57ff',
        reason: 'Same person created from two sources',
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Merge operation completed' })
  merge(
    @Body('primaryEntityId') primaryEntityId: string,
    @Body('duplicateEntityId') duplicateEntityId: string,
    @Body('reason') reason?: string,
  ) {
    return this.resolutionService.mergeEntities(primaryEntityId, duplicateEntityId, reason);
  }

  @Post('unmerge/:mergeId')
  @ApiOperation({ summary: 'Unmerge a previous merge operation', description: 'Revert an active merge event by merge_id.' })
  @ApiParam({ name: 'mergeId', description: 'Merge event identifier (merge_id)' })
  @ApiResponse({ status: 200, description: 'Unmerge operation completed' })
  unmerge(@Param('mergeId') mergeId: string) {
    return this.resolutionService.unmergeEntities(mergeId);
  }
}

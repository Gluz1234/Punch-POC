import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { DynamicService } from './dynamic.service';
import { EntityResolutionService } from '../entities/entity-resolution.service';

@ApiTags('Dynamic')
@Controller('dynamic')
export class DynamicController {
  constructor(
    private readonly dynamicService: DynamicService,
    private readonly resolutionService: EntityResolutionService,
  ) {}

  // ── Smart create ──────────────────────────────────────────────────────────

  // POST /api/dynamic/smart-create
  // Body: { label, properties? }
  // Checks if the type exists; if not, registers a new schema type, then creates the node.
  @Post('smart-create')
  @ApiOperation({ summary: 'Auto-detect or register type, then create a node' })
  @ApiBody({ schema: { example: { label: 'Course', icon: '📚', properties: { title: 'AI Fundamentals', credits: 3, active: true }, propertyTypes: { title: 'STRING', credits: 'INTEGER', active: 'BOOLEAN' } } } })
  smartCreate(@Body() dto: { label: string; icon?: string; properties?: Record<string, any> }) {
    return this.dynamicService.smartCreate(dto);
  }

  // ── Node endpoints ────────────────────────────────────────────────────────

  // POST /api/dynamic/nodes
  // Body: { labels, idField, id, properties?, createConstraint? }
  @Post('nodes')
  createNode(@Body() dto: any) {
    return this.dynamicService.upsertNode(dto);
  }

  // GET /api/dynamic/nodes/:label?limit=100
  @Get('nodes/:label')
  findByLabel(
    @Param('label')   label:  string,
    @Query('limit')   limit?: string,
  ) {
    return this.dynamicService.findByLabel(label, limit ? parseInt(limit, 10) : 100);
  }

  // GET /api/dynamic/nodes/:label/:idField/:id
  @Get('nodes/:label/:idField/:id')
  findOne(
    @Param('label')   label:   string,
    @Param('idField') idField: string,
    @Param('id')      id:      string,
  ) {
    return this.dynamicService.findOne(label, idField, id);
  }

  // PUT /api/dynamic/nodes/:label/:idField/:id
  // Body: { properties: { key: value, ... } }
  @Put('nodes/:label/:idField/:id')
  updateNode(
    @Param('label')   label:   string,
    @Param('idField') idField: string,
    @Param('id')      id:      string,
    @Body('properties') properties: Record<string, any>,
  ) {
    return this.dynamicService.updateNode(label, idField, id, properties ?? {});
  }

  // PUT /api/dynamic/entity/:entityId
  // Body: { properties: { key: value, ... } }
  // Updates by canonical entity_id only (no type in URL).
  // Only keys that already exist on the node are updated.
  @Put('entity/:entityId')
  @ApiOperation({
    summary: 'Update entity by ID',
    description: 'Updates any entity using entity_id only. Only properties that already exist on the node are updated.',
  })
  @ApiParam({ name: 'entityId', description: 'Entity UUID (entity_id)', example: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea' })
  @ApiBody({ schema: { example: { properties: { gpa: 4.0, enrollment_year: 2020 } } } })
  @ApiResponse({ status: 200, description: 'Entity updated successfully' })
  @ApiResponse({ status: 400, description: 'No valid existing properties were provided' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  updateByEntityId(
    @Param('entityId') entityId: string,
    @Body('properties') properties: Record<string, any>,
  ) {
    return this.resolutionService.updateByEntityId(entityId, properties ?? {});
  }

  // DELETE /api/dynamic/nodes/:label/:idField/:id
  @Delete('nodes/:label/:idField/:id')
  @HttpCode(200)
  deleteNode(
    @Param('label')   label:   string,
    @Param('idField') idField: string,
    @Param('id')      id:      string,
  ) {
    return this.dynamicService.deleteNode(label, idField, id);
  }

  // POST /api/dynamic/nodes/:label/:idField/:id/labels
  // Body: { newLabel: "SomeLabel" }
  // Adds a second label to an existing node without removing any existing labels
  @Post('nodes/:label/:idField/:id/labels')
  addLabel(
    @Param('label')   label:    string,
    @Param('idField') idField:  string,
    @Param('id')      id:       string,
    @Body('newLabel') newLabel: string,
  ) {
    return this.dynamicService.addLabel(label, idField, id, newLabel);
  }

  // ── Relationship endpoints ────────────────────────────────────────────────

  // POST /api/dynamic/relationships
  // Body: { fromLabel, fromIdField, fromId, toLabel, toIdField, toId, type, properties? }
  @Post('relationships')
  createRelationship(@Body() dto: any) {
    return this.dynamicService.createRelationship(dto);
  }

  // GET /api/dynamic/relationships/:label/:idField/:id?direction=out|in|both
  @Get('relationships/:label/:idField/:id')
  getRelationships(
    @Param('label')     label:      string,
    @Param('idField')   idField:    string,
    @Param('id')        id:         string,
    @Query('direction') direction?: string,
  ) {
    return this.dynamicService.getRelationships(label, idField, id, direction ?? 'both');
  }

  // DELETE /api/dynamic/relationships
  // Body: { fromLabel, fromIdField, fromId, toLabel, toIdField, toId, type }
  @Delete('relationships')
  @HttpCode(200)
  deleteRelationship(@Body() dto: any) {
    return this.dynamicService.deleteRelationship(dto);
  }

  // DELETE /api/dynamic/entity/:entityId
  // Deletes any entity by entity_id alone — no label or idField needed.
  @Delete('entity/:entityId')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Delete entity by ID',
    description: 'Permanently deletes any entity and all its relationships using entity_id alone. Resolves merged aliases to the canonical node before deletion.',
  })
  @ApiParam({ name: 'entityId', description: 'Entity UUID (entity_id)', example: '3a8ddf2b-f4be-4f00-a355-4b3f54db58ea' })
  @ApiResponse({ status: 200, description: 'Entity deleted successfully' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  deleteByEntityId(@Param('entityId') entityId: string) {
    return this.resolutionService.deleteByEntityId(entityId);
  }
}

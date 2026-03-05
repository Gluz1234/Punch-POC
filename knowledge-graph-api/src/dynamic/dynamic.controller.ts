import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, HttpCode,
} from '@nestjs/common';
import { DynamicService } from './dynamic.service';

@Controller('dynamic')
export class DynamicController {
  constructor(private readonly dynamicService: DynamicService) {}

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
}

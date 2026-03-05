import { Controller, Get, Post, Delete, Param, Body, HttpCode } from '@nestjs/common';
import { RelationshipsService } from './relationships.service';

@Controller('relationships')
export class RelationshipsController {
  constructor(private readonly relationshipsService: RelationshipsService) {}

  // ── Person relationship listings ──────────────────────────────────────────

  // GET /api/relationships/person/:strongId
  @Get('person/:strongId')
  getPersonRelationships(@Param('strongId') strongId: string) {
    return this.relationshipsService.getPersonRelationships(strongId);
  }

  // GET /api/relationships/person/:strongId/tenant/:tenantId
  @Get('person/:strongId/tenant/:tenantId')
  getPersonRelationshipsByTenant(
    @Param('strongId') strongId: string,
    @Param('tenantId') tenantId: string,
  ) {
    return this.relationshipsService.getPersonRelationships(strongId, tenantId);
  }

  // ── Create routes ─────────────────────────────────────────────────────────

  // POST /api/relationships/enrolled-in
  @Post('enrolled-in')
  createEnrolledIn(@Body() dto: any) {
    return this.relationshipsService.createEnrolledIn(dto);
  }

  // POST /api/relationships/works-at
  @Post('works-at')
  createWorksAt(@Body() dto: any) {
    return this.relationshipsService.createWorksAt(dto);
  }

  // POST /api/relationships/lives-in
  @Post('lives-in')
  createLivesIn(@Body() dto: any) {
    return this.relationshipsService.createLivesIn(dto);
  }

  // POST /api/relationships/has-skill
  @Post('has-skill')
  createHasSkill(@Body() dto: any) {
    return this.relationshipsService.createHasSkill(dto);
  }

  // POST /api/relationships/completed
  @Post('completed')
  createCompleted(@Body() dto: any) {
    return this.relationshipsService.createCompleted(dto);
  }

  // POST /api/relationships/provided-by
  @Post('provided-by')
  createProvidedBy(@Body() dto: any) {
    return this.relationshipsService.createProvidedBy(dto);
  }

  // POST /api/relationships/requires-skill
  @Post('requires-skill')
  createRequiresSkill(@Body() dto: any) {
    return this.relationshipsService.createRequiresSkill(dto);
  }

  // POST /api/relationships/has-advisor
  @Post('has-advisor')
  createHasAdvisor(@Body() dto: any) {
    return this.relationshipsService.createHasAdvisor(dto);
  }

  // POST /api/relationships/registered-for
  @Post('registered-for')
  createRegisteredFor(@Body() dto: any) {
    return this.relationshipsService.createRegisteredFor(dto);
  }

  // POST /api/relationships/reports-to
  @Post('reports-to')
  createReportsTo(@Body() dto: any) {
    return this.relationshipsService.createReportsTo(dto);
  }

  // POST /api/relationships/works-in
  @Post('works-in')
  createWorksIn(@Body() dto: any) {
    return this.relationshipsService.createWorksIn(dto);
  }

  // POST /api/relationships/registered-at
  @Post('registered-at')
  createRegisteredAt(@Body() dto: any) {
    return this.relationshipsService.createRegisteredAt(dto);
  }

  // POST /api/relationships/affiliated-with
  @Post('affiliated-with')
  createAffiliatedWith(@Body() dto: any) {
    return this.relationshipsService.createAffiliatedWith(dto);
  }

  // POST /api/relationships/offered-by
  @Post('offered-by')
  createOfferedBy(@Body() dto: any) {
    return this.relationshipsService.createOfferedBy(dto);
  }

  // POST /api/relationships/belongs-to
  @Post('belongs-to')
  createBelongsTo(@Body() dto: any) {
    return this.relationshipsService.createBelongsTo(dto);
  }

  // ── Delete routes ─────────────────────────────────────────────────────────

  // DELETE /api/relationships/enrolled-in/:personId/:orgId/:tenantId
  @Delete('enrolled-in/:personId/:orgId/:tenantId')
  @HttpCode(200)
  deleteEnrolledIn(
    @Param('personId') personId: string,
    @Param('orgId')    orgId:    string,
    @Param('tenantId') tenantId: string,
  ) {
    return this.relationshipsService.deleteEnrolledIn(personId, orgId, tenantId);
  }

  // DELETE /api/relationships/works-at/:personId/:orgId/:tenantId
  @Delete('works-at/:personId/:orgId/:tenantId')
  @HttpCode(200)
  deleteWorksAt(
    @Param('personId') personId: string,
    @Param('orgId')    orgId:    string,
    @Param('tenantId') tenantId: string,
  ) {
    return this.relationshipsService.deleteWorksAt(personId, orgId, tenantId);
  }

  // DELETE /api/relationships/lives-in/:personId/:locationId/:tenantId
  @Delete('lives-in/:personId/:locationId/:tenantId')
  @HttpCode(200)
  deleteLivesIn(
    @Param('personId')   personId:   string,
    @Param('locationId') locationId: string,
    @Param('tenantId')   tenantId:   string,
  ) {
    return this.relationshipsService.deleteLivesIn(personId, locationId, tenantId);
  }

  // DELETE /api/relationships/has-skill/:personId/:skillId/:tenantId
  @Delete('has-skill/:personId/:skillId/:tenantId')
  @HttpCode(200)
  deleteHasSkill(
    @Param('personId') personId: string,
    @Param('skillId')  skillId:  string,
    @Param('tenantId') tenantId: string,
  ) {
    return this.relationshipsService.deleteHasSkill(personId, skillId, tenantId);
  }
}

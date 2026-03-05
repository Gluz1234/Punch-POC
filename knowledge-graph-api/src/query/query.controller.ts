import { Controller, Get, Param, Query } from '@nestjs/common';
import { QueryService } from './query.service';

@Controller('query')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  // ── Tenant-scoped ─────────────────────────────────────────────────────────

  // GET /api/query/enrolled-in/:orgId/:tenantId
  @Get('enrolled-in/:orgId/:tenantId')
  enrolledInOrg(
    @Param('orgId')    orgId:    string,
    @Param('tenantId') tenantId: string,
  ) {
    return this.queryService.getPersonsEnrolledInOrg(orgId, tenantId);
  }

  // GET /api/query/works-at/:orgId/:tenantId
  @Get('works-at/:orgId/:tenantId')
  worksAtOrg(
    @Param('orgId')    orgId:    string,
    @Param('tenantId') tenantId: string,
  ) {
    return this.queryService.getPersonsWorkingAtOrg(orgId, tenantId);
  }

  // GET /api/query/lives-in/:locationId?tenantId=xxx
  @Get('lives-in/:locationId')
  livesInLocation(
    @Param('locationId') locationId: string,
    @Query('tenantId')   tenantId?:  string,
  ) {
    return this.queryService.getPersonsLivingInLocation(locationId, tenantId);
  }

  // GET /api/query/registered-at/:locationId/:tenantId
  @Get('registered-at/:locationId/:tenantId')
  registeredAtLocation(
    @Param('locationId') locationId: string,
    @Param('tenantId')   tenantId:   string,
  ) {
    return this.queryService.getPersonsRegisteredAtLocation(locationId, tenantId);
  }

  // ── Cross-tenant ──────────────────────────────────────────────────────────

  // GET /api/query/cross/enrolled-and-working?orgA=&tenantA=&orgB=&tenantB=
  @Get('cross/enrolled-and-working')
  enrolledAndWorking(
    @Query('orgA')    orgA:    string,
    @Query('tenantA') tenantA: string,
    @Query('orgB')    orgB:    string,
    @Query('tenantB') tenantB: string,
  ) {
    return this.queryService.getPersonsEnrolledAndWorking(orgA, tenantA, orgB, tenantB);
  }

  // GET /api/query/cross/multiple-employers?tenantA=&tenantB=
  @Get('cross/multiple-employers')
  multipleEmployers(
    @Query('tenantA') tenantA: string,
    @Query('tenantB') tenantB: string,
  ) {
    return this.queryService.getPersonsWithMultipleEmployers(tenantA, tenantB);
  }

  // ── Global ────────────────────────────────────────────────────────────────

  // GET /api/query/skill/:skillId
  @Get('skill/:skillId')
  withSkill(@Param('skillId') skillId: string) {
    return this.queryService.getPersonsWithSkill(skillId);
  }

  // GET /api/query/tenants-for-person/:strongId
  @Get('tenants-for-person/:strongId')
  tenantsForPerson(@Param('strongId') strongId: string) {
    return this.queryService.getTenantsForPerson(strongId);
  }

  // GET /api/query/org-chart/:orgId/:tenantId
  @Get('org-chart/:orgId/:tenantId')
  orgChart(
    @Param('orgId')    orgId:    string,
    @Param('tenantId') tenantId: string,
  ) {
    return this.queryService.getOrgChart(orgId, tenantId);
  }

  // GET /api/query/course-registrations/:courseId/:tenantId
  @Get('course-registrations/:courseId/:tenantId')
  courseRegistrations(
    @Param('courseId') courseId: string,
    @Param('tenantId') tenantId: string,
  ) {
    return this.queryService.getCourseRegistrations(courseId, tenantId);
  }

  // GET /api/query/label/:label?tenantId=xxx
  // Returns all Person nodes that carry the given subtype label
  @Get('label/:label')
  personsByLabel(
    @Param('label')    label:     string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.queryService.getPersonsByLabel(label, tenantId);
  }
}

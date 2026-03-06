import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { PromotionsService } from './promotions.service';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  // GET /api/promotions/person/:strongId/labels
  @Get('person/:strongId/labels')
  getLabels(@Param('strongId') strongId: string) {
    return this.promotionsService.getLabels(strongId);
  }

  // POST /api/promotions/person/:strongId/student
  @Post('person/:strongId/student')
  promoteToStudent(@Param('strongId') strongId: string, @Body() dto: any) {
    return this.promotionsService.promoteToStudent(strongId, dto);
  }

  // POST /api/promotions/person/:strongId/employee
  @Post('person/:strongId/employee')
  promoteToEmployee(@Param('strongId') strongId: string, @Body() dto: any) {
    return this.promotionsService.promoteToEmployee(strongId, dto);
  }

  // POST /api/promotions/person/:strongId/resident
  @Post('person/:strongId/resident')
  promoteToResident(@Param('strongId') strongId: string, @Body() dto: any) {
    return this.promotionsService.promoteToResident(strongId, dto);
  }

  // POST /api/promotions/person/:strongId/researcher
  @Post('person/:strongId/researcher')
  promoteToResearcher(@Param('strongId') strongId: string, @Body() dto: any) {
    return this.promotionsService.promoteToResearcher(strongId, dto);
  }

  // POST /api/promotions/person/:strongId/subtype/:subtype
  @Post('person/:strongId/subtype/:subtype')
  promoteToSubtype(
    @Param('strongId') strongId: string,
    @Param('subtype') subtype: string,
    @Body() properties: Record<string, any>
  ) {
    return this.promotionsService.promoteToSubtype(strongId, subtype, properties);
  }

  // GET /api/promotions/students/:tenantId
  @Get('students/:tenantId')
  getStudents(@Param('tenantId') tenantId: string) {
    return this.promotionsService.getStudents(tenantId);
  }

  // GET /api/promotions/employees/:tenantId
  @Get('employees/:tenantId')
  getEmployees(@Param('tenantId') tenantId: string) {
    return this.promotionsService.getEmployees(tenantId);
  }

  // GET /api/promotions/researchers
  @Get('researchers')
  getResearchers() {
    return this.promotionsService.getResearchers();
  }

  // GET /api/promotions/residents/:tenantId
  @Get('residents/:tenantId')
  getResidents(@Param('tenantId') tenantId: string) {
    return this.promotionsService.getResidents(tenantId);
  }

  // GET /api/promotions/artists
  @Get('artists')
  getArtists() {
    return this.promotionsService.getArtists();
  }
}

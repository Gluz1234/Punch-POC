import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode } from '@nestjs/common';
import { DepartmentsService } from './departments.service';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  // POST /api/departments
  @Post()
  create(@Body() dto: any) {
    return this.departmentsService.upsert(dto);
  }

  // PUT /api/departments/:departmentId
  @Put(':departmentId')
  update(@Param('departmentId') departmentId: string, @Body() dto: any) {
    return this.departmentsService.upsert({ ...dto, departmentId });
  }

  // GET /api/departments
  @Get()
  findAll() {
    return this.departmentsService.findAll();
  }

  // GET /api/departments/by-org/:orgId
  @Get('by-org/:orgId')
  findByOrg(@Param('orgId') orgId: string) {
    return this.departmentsService.findByOrg(orgId);
  }

  // GET /api/departments/:departmentId
  @Get(':departmentId')
  findOne(@Param('departmentId') departmentId: string) {
    return this.departmentsService.findOne(departmentId);
  }

  // DELETE /api/departments/:departmentId
  @Delete(':departmentId')
  @HttpCode(200)
  remove(@Param('departmentId') departmentId: string) {
    return this.departmentsService.remove(departmentId);
  }
}

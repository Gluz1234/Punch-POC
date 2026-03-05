import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  // POST /api/organizations
  @Post()
  create(@Body() dto: any) {
    return this.organizationsService.upsert(dto);
  }

  // PUT /api/organizations/:orgId
  @Put(':orgId')
  update(@Param('orgId') orgId: string, @Body() dto: any) {
    return this.organizationsService.upsert({ ...dto, orgId });
  }

  // GET /api/organizations
  @Get()
  findAll() {
    return this.organizationsService.findAll();
  }

  // GET /api/organizations/:orgId
  @Get(':orgId')
  findOne(@Param('orgId') orgId: string) {
    return this.organizationsService.findOne(orgId);
  }

  // DELETE /api/organizations/:orgId
  @Delete(':orgId')
  @HttpCode(200)
  remove(@Param('orgId') orgId: string) {
    return this.organizationsService.remove(orgId);
  }
}

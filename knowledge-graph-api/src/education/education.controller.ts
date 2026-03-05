import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode } from '@nestjs/common';
import { EducationService } from './education.service';

@Controller('education')
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  // POST /api/education
  @Post()
  create(@Body() dto: any) {
    return this.educationService.upsert(dto);
  }

  // PUT /api/education/:educationId
  @Put(':educationId')
  update(@Param('educationId') educationId: string, @Body() dto: any) {
    return this.educationService.upsert({ ...dto, educationId });
  }

  // GET /api/education
  @Get()
  findAll() {
    return this.educationService.findAll();
  }

  // GET /api/education/:educationId
  @Get(':educationId')
  findOne(@Param('educationId') educationId: string) {
    return this.educationService.findOne(educationId);
  }

  // DELETE /api/education/:educationId
  @Delete(':educationId')
  @HttpCode(200)
  remove(@Param('educationId') educationId: string) {
    return this.educationService.remove(educationId);
  }
}

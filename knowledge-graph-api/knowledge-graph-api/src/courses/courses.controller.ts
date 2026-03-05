import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode } from '@nestjs/common';
import { CoursesService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // POST /api/courses
  @Post()
  create(@Body() dto: any) {
    return this.coursesService.upsert(dto);
  }

  // PUT /api/courses/:courseId
  @Put(':courseId')
  update(@Param('courseId') courseId: string, @Body() dto: any) {
    return this.coursesService.upsert({ ...dto, courseId });
  }

  // GET /api/courses
  @Get()
  findAll() {
    return this.coursesService.findAll();
  }

  // GET /api/courses/by-org/:orgId
  @Get('by-org/:orgId')
  findByOrg(@Param('orgId') orgId: string) {
    return this.coursesService.findByOrg(orgId);
  }

  // GET /api/courses/:courseId
  @Get(':courseId')
  findOne(@Param('courseId') courseId: string) {
    return this.coursesService.findOne(courseId);
  }

  // DELETE /api/courses/:courseId
  @Delete(':courseId')
  @HttpCode(200)
  remove(@Param('courseId') courseId: string) {
    return this.coursesService.remove(courseId);
  }
}

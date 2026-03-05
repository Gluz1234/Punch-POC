import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode } from '@nestjs/common';
import { SkillsService } from './skills.service';

@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  // POST /api/skills
  @Post()
  create(@Body() dto: any) {
    return this.skillsService.upsert(dto);
  }

  // PUT /api/skills/:skillId
  @Put(':skillId')
  update(@Param('skillId') skillId: string, @Body() dto: any) {
    return this.skillsService.upsert({ ...dto, skillId });
  }

  // GET /api/skills
  @Get()
  findAll() {
    return this.skillsService.findAll();
  }

  // GET /api/skills/:skillId
  @Get(':skillId')
  findOne(@Param('skillId') skillId: string) {
    return this.skillsService.findOne(skillId);
  }

  // DELETE /api/skills/:skillId
  @Delete(':skillId')
  @HttpCode(200)
  remove(@Param('skillId') skillId: string) {
    return this.skillsService.remove(skillId);
  }
}

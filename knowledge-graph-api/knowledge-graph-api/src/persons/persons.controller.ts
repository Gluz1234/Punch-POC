import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode } from '@nestjs/common';
import { PersonsService } from './persons.service';

@Controller('persons')
export class PersonsController {
  constructor(private readonly personsService: PersonsService) {}

  // POST /api/persons
  @Post()
  create(@Body() dto: any) {
    return this.personsService.upsert(dto);
  }

  // PUT /api/persons/:strongId
  @Put(':strongId')
  update(@Param('strongId') strongId: string, @Body() dto: any) {
    return this.personsService.upsert({ ...dto, strongId });
  }

  // GET /api/persons
  @Get()
  findAll() {
    return this.personsService.findAll();
  }

  // GET /api/persons/:strongId
  @Get(':strongId')
  findOne(@Param('strongId') strongId: string) {
    return this.personsService.findOne(strongId);
  }

  // DELETE /api/persons/:strongId
  @Delete(':strongId')
  @HttpCode(200)
  remove(@Param('strongId') strongId: string) {
    return this.personsService.remove(strongId);
  }
}

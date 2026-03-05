import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode } from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  // POST /api/locations
  @Post()
  create(@Body() dto: any) {
    return this.locationsService.upsert(dto);
  }

  // PUT /api/locations/:locationId
  @Put(':locationId')
  update(@Param('locationId') locationId: string, @Body() dto: any) {
    return this.locationsService.upsert({ ...dto, locationId });
  }

  // GET /api/locations
  @Get()
  findAll() {
    return this.locationsService.findAll();
  }

  // GET /api/locations/:locationId
  @Get(':locationId')
  findOne(@Param('locationId') locationId: string) {
    return this.locationsService.findOne(locationId);
  }

  // DELETE /api/locations/:locationId
  @Delete(':locationId')
  @HttpCode(200)
  remove(@Param('locationId') locationId: string) {
    return this.locationsService.remove(locationId);
  }
}

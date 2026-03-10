import { Module } from '@nestjs/common';
import { EntityResolutionController } from './entity-resolution.controller';
import { EntityResolutionService } from './entity-resolution.service';

@Module({
  controllers: [EntityResolutionController],
  providers: [EntityResolutionService],
  exports: [EntityResolutionService],
})
export class EntityResolutionModule {}

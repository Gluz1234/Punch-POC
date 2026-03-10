import { Module } from '@nestjs/common';
import { DynamicController } from './dynamic.controller';
import { DynamicService }    from './dynamic.service';
import { SchemaModule }      from '../schema/schema.module';
import { EntityResolutionModule } from '../entities/entity-resolution.module';

@Module({
  imports:     [SchemaModule, EntityResolutionModule],
  controllers: [DynamicController],
  providers:   [DynamicService],
})
export class DynamicModule {}

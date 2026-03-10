import { Module } from '@nestjs/common';
import { DynamicController } from './dynamic.controller';
import { DynamicService }    from './dynamic.service';
import { DynamicEntityRegistryService } from './dynamic-entity-registry.service';
import { SchemaModule }      from '../schema/schema.module';
import { PromotionsModule }  from '../promotions/promotions.module';
import { EntityResolutionModule } from '../shared/entity-resolution.module';

@Module({
  imports:     [SchemaModule, PromotionsModule, EntityResolutionModule],
  controllers: [DynamicController],
  providers:   [DynamicService, DynamicEntityRegistryService],
  exports:     [DynamicEntityRegistryService],
})
export class DynamicModule {}

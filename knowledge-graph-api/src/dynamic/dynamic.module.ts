import { Module } from '@nestjs/common';
import { DynamicController } from './dynamic.controller';
import { DynamicService }    from './dynamic.service';
import { SchemaModule }      from '../schema/schema.module';
import { PromotionsModule }  from '../promotions/promotions.module';

@Module({
  imports:     [SchemaModule, PromotionsModule],
  controllers: [DynamicController],
  providers:   [DynamicService],
})
export class DynamicModule {}

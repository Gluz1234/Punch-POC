import { Module } from '@nestjs/common';
import { DynamicController } from './dynamic.controller';
import { DynamicService }    from './dynamic.service';
import { SchemaModule }      from '../schema/schema.module';

@Module({
  imports:     [SchemaModule],
  controllers: [DynamicController],
  providers:   [DynamicService],
})
export class DynamicModule {}

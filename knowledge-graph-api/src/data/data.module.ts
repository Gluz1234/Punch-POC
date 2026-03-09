import { Module } from '@nestjs/common';
import { DataService } from './data.service';
import { DataController } from './data.controller';
import { SchemaModule } from '../schema/schema.module';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [SchemaModule, PromotionsModule],
  providers: [DataService],
  controllers: [DataController],
})
export class DataModule {}

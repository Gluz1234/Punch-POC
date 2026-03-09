import { Module } from '@nestjs/common';
import { RelationshipsController } from './relationships.controller';
import { RelationshipsService }    from './relationships.service';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [PromotionsModule],
  controllers: [RelationshipsController],
  providers:   [RelationshipsService],
})
export class RelationshipsModule {}

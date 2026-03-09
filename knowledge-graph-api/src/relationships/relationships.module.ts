import { Module } from '@nestjs/common';
import { RelationshipsController } from './relationships.controller';
import { RelationshipsService }    from './relationships.service';
import { PromotionsModule } from '../promotions/promotions.module';
import { EntityResolutionModule } from '../shared/entity-resolution.module';

@Module({
  imports: [PromotionsModule, EntityResolutionModule],
  controllers: [RelationshipsController],
  providers:   [RelationshipsService],
})
export class RelationshipsModule {}

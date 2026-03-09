import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { PromotionProjectionService } from './promotion-projection.service';
import { PromotionSchemaService } from './promotion-schema.service';
import { EntityResolutionModule } from '../shared/entity-resolution.module';

@Module({
  imports: [EntityResolutionModule],
  controllers: [PromotionsController],
  providers:   [PromotionsService, PromotionProjectionService, PromotionSchemaService],
  exports:     [PromotionSchemaService, PromotionProjectionService],
})
export class PromotionsModule {}

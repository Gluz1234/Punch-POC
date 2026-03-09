import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { PromotionProjectionService } from './promotion-projection.service';
import { PromotionSchemaService } from './promotion-schema.service';

@Module({
  controllers: [PromotionsController],
  providers:   [PromotionsService, PromotionProjectionService, PromotionSchemaService],
  exports:     [PromotionSchemaService, PromotionProjectionService],
})
export class PromotionsModule {}

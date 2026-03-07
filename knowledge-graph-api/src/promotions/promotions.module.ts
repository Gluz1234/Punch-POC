import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller';
import { PromotionsService, PromotionProjectionService } from './promotions.service';
import { PromotionSchemaService } from './promotion-schema.service';

@Module({
  controllers: [PromotionsController],
  providers:   [PromotionsService, PromotionProjectionService, PromotionSchemaService],
  exports:     [PromotionSchemaService], // Export for use in other modules
})
export class PromotionsModule {}

import { Module } from '@nestjs/common';
import { SchemaController } from './schema.controller';
import { SchemaService }    from './schema.service';
import { SchemaRegistrationService } from './schema-registration.service';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [PromotionsModule], // For PromotionSchemaService
  controllers: [SchemaController],
  providers:   [SchemaService, SchemaRegistrationService],
  exports:     [SchemaService, SchemaRegistrationService], // Export for use in other modules
})
export class SchemaModule {}

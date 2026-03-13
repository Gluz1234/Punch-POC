import { Module } from '@nestjs/common';
import { SchemaController } from './schema.controller';
import { SchemaService }    from './schema.service';
import { SchemaRegistrationService } from './schema-registration.service';
import { PromotionsModule } from '../promotions/promotions.module';
import { PropertySecurityService } from '../auth/property-security.service';

@Module({
  imports: [PromotionsModule], // For PromotionSchemaService
  controllers: [SchemaController],
  providers:   [SchemaService, SchemaRegistrationService, PropertySecurityService],
  exports:     [SchemaService, SchemaRegistrationService, PropertySecurityService],
})
export class SchemaModule {}

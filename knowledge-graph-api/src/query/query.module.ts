import { Module } from '@nestjs/common';
import { QueryController } from './query.controller';
import { QueryService }    from './query.service';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [PromotionsModule],
  controllers: [QueryController],
  providers:   [QueryService],
})
export class QueryModule {}

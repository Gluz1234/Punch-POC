import { Module } from '@nestjs/common';
import { DataService } from './data.service';
import { DataController } from './data.controller';
import { SchemaModule } from '../schema/schema.module';

@Module({
  imports: [SchemaModule],
  providers: [DataService],
  controllers: [DataController],
})
export class DataModule {}

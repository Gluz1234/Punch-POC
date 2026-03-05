import { Module } from '@nestjs/common';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { GenericQueryService } from './generic-query.service';
import { GenericQueryController } from './generic-query.controller';
import { SimplifiedQueryService } from './simplified-query.service';
import { SimplifiedQueryController } from './simplified-query.controller';
import { FullTextSearchService } from './full-text-search.service';
import { FullTextSearchController } from './full-text-search.controller';

@Module({
  imports: [Neo4jModule],
  providers: [GenericQueryService, SimplifiedQueryService, FullTextSearchService],
  controllers: [GenericQueryController, SimplifiedQueryController, FullTextSearchController],
  exports: [GenericQueryService, SimplifiedQueryService, FullTextSearchService],
})
export class GenericQueryModule {}

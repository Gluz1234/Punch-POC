import { Module } from '@nestjs/common';
import { Neo4jModule } from './neo4j/neo4j.module';
import { GenericEntityModule } from './shared/generic-entity.module';
import { GenericQueryModule } from './shared/generic-query.module';
import { getAllEntities } from './shared/entity-config';
import { RelationshipsModule } from './relationships/relationships.module';
import { PromotionsModule } from './promotions/promotions.module';
import { DynamicModule } from './dynamic/dynamic.module';
import { SchemaModule } from './schema/schema.module';
import { QueryModule } from './query/query.module';
import { DataModule } from './data/data.module';
import { EntityResolutionModule } from './shared/entity-resolution.module';

@Module({
  imports: [
    Neo4jModule, // @Global() — provides Neo4jService to every other module
    
    // Dynamically register all standard entity modules from config
    ...GenericEntityModule.forAllEntities(getAllEntities()),
    
    // Generic query builder (makes complex queries easy without hardcoding)
    GenericQueryModule,
    
    // Specialized modules (relationships, promotions, schema queries)
    RelationshipsModule,
    PromotionsModule,
    DynamicModule,
    SchemaModule,
    QueryModule,
    DataModule,
    EntityResolutionModule,
  ],
})
export class AppModule {}

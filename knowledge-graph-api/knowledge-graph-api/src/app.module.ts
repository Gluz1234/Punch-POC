import { Module }             from '@nestjs/common';
import { Neo4jModule }         from './neo4j/neo4j.module';
import { PersonsModule }       from './persons/persons.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { LocationsModule }     from './locations/locations.module';
import { SkillsModule }        from './skills/skills.module';
import { EducationModule }     from './education/education.module';
import { CoursesModule }       from './courses/courses.module';
import { DepartmentsModule }   from './departments/departments.module';
import { RelationshipsModule } from './relationships/relationships.module';
import { PromotionsModule }    from './promotions/promotions.module';
import { DynamicModule }       from './dynamic/dynamic.module';
import { SchemaModule }        from './schema/schema.module';
import { QueryModule }         from './query/query.module';

@Module({
  imports: [
    Neo4jModule,          // @Global() — provides Neo4jService to every other module
    PersonsModule,
    OrganizationsModule,
    LocationsModule,
    SkillsModule,
    EducationModule,
    CoursesModule,
    DepartmentsModule,
    RelationshipsModule,
    PromotionsModule,
    DynamicModule,
    SchemaModule,
    QueryModule,
  ],
})
export class AppModule {}

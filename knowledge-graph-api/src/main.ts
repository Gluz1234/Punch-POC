import { NestFactory } from '@nestjs/core';
import { AppModule }   from './app.module';
import { FullTextSearchService } from './shared/full-text-search.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors();

  // Initialize full-text search indexes (non-blocking)
  const fullTextSearch = app.get(FullTextSearchService);
  try {
    await fullTextSearch.initializeIndexes();
  } catch (err) {
    console.warn('⚠ Full-text search index initialization failed (will retry on first search):', err);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`
╔══════════════════════════════════════════════════════════╗
║   Knowledge Graph Admin API  →  http://localhost:${port}/api  ║
╚══════════════════════════════════════════════════════════╝

  ENTITIES
    POST/PUT/GET/DELETE  /api/persons
    POST/PUT/GET/DELETE  /api/organizations
    POST/PUT/GET/DELETE  /api/locations
    POST/PUT/GET/DELETE  /api/skills
    POST/PUT/GET/DELETE  /api/education
    POST/PUT/GET/DELETE  /api/courses
    POST/PUT/GET/DELETE  /api/departments

  RELATIONSHIPS  (all tenant-scoped, body must include tenantId)
    POST  /api/relationships/enrolled-in
    POST  /api/relationships/works-at
    POST  /api/relationships/lives-in
    POST  /api/relationships/has-skill
    POST  /api/relationships/completed
    POST  /api/relationships/provided-by
    POST  /api/relationships/requires-skill
    POST  /api/relationships/has-advisor
    POST  /api/relationships/registered-for
    POST  /api/relationships/reports-to
    POST  /api/relationships/works-in
    POST  /api/relationships/registered-at
    POST  /api/relationships/affiliated-with
    POST  /api/relationships/offered-by
    POST  /api/relationships/belongs-to
    DELETE /api/relationships/enrolled-in/:personId/:orgId/:tenantId
    DELETE /api/relationships/works-at/:personId/:orgId/:tenantId
    DELETE /api/relationships/lives-in/:personId/:locationId/:tenantId
    DELETE /api/relationships/has-skill/:personId/:skillId/:tenantId
    GET   /api/relationships/person/:strongId
    GET   /api/relationships/person/:strongId/tenant/:tenantId

  PROMOTIONS
    GET   /api/promotions/person/:strongId/labels
    POST  /api/promotions/person/:strongId/student
    POST  /api/promotions/person/:strongId/employee
    POST  /api/promotions/person/:strongId/resident
    POST  /api/promotions/person/:strongId/researcher
    GET   /api/promotions/students/:tenantId
    GET   /api/promotions/employees/:tenantId
    GET   /api/promotions/researchers
    GET   /api/promotions/residents/:tenantId

  DYNAMIC  (brand-new types at runtime — no code change needed)
    POST   /api/dynamic/nodes
    GET    /api/dynamic/nodes/:label
    GET    /api/dynamic/nodes/:label/:idField/:id
    PUT    /api/dynamic/nodes/:label/:idField/:id
    DELETE /api/dynamic/nodes/:label/:idField/:id
    POST   /api/dynamic/nodes/:label/:idField/:id/labels
    POST   /api/dynamic/relationships
    GET    /api/dynamic/relationships/:label/:idField/:id?direction=out|in|both
    DELETE /api/dynamic/relationships

  QUERIES
    GET  /api/query/enrolled-in/:orgId/:tenantId
    GET  /api/query/works-at/:orgId/:tenantId
    GET  /api/query/lives-in/:locationId?tenantId=
    GET  /api/query/registered-at/:locationId/:tenantId
    GET  /api/query/cross/enrolled-and-working?orgA=&tenantA=&orgB=&tenantB=
    GET  /api/query/cross/multiple-employers?tenantA=&tenantB=
    GET  /api/query/skill/:skillId
    GET  /api/query/tenants-for-person/:strongId
    GET  /api/query/org-chart/:orgId/:tenantId
    GET  /api/query/course-registrations/:courseId/:tenantId
    GET  /api/query/label/:label?tenantId=

  SEARCH  (full-text search with Lucene syntax)
    GET  /api/search/persons?q=john
    GET  /api/search/organizations?q=microsoft
    GET  /api/search/skills?q=java
    GET  /api/search/courses?q=python
    GET  /api/search/advanced?entity=person&q=john*&limit=50

  SCHEMA  (live graph introspection)
    GET  /api/schema
    GET  /api/schema/labels
    GET  /api/schema/labels/:label/properties
    GET  /api/schema/relationship-types
    GET  /api/schema/relationship-types/:type/properties
    GET  /api/schema/constraints
    GET  /api/schema/indexes
    GET  /api/schema/counts
    GET  /api/schema/tenants
  `);
}

bootstrap();

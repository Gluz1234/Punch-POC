import { NestFactory } from '@nestjs/core';
import { AppModule }   from './app.module';
import { FullTextSearchService } from './query/full-text-search.service';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors();

  // Swagger/OpenAPI Configuration
  const config = new DocumentBuilder()
    .setTitle('Knowledge Graph API')
    .setDescription('Multi-Tenant Knowledge Graph Admin API with dynamic entity creation and promotion system')
    .setVersion('2.0')
    .addTag('Entities', 'Standard entity CRUD operations (Person, Organization, Location, etc.)')
    .addTag('Relationships', 'Create and manage tenant-scoped relationships between entities')
    .addTag('Promotions', 'Promote any entity to subtypes dynamically (Student, Employee, custom subtypes on Person, Organization, etc.)')
    .addTag('Dynamic', 'Create and manage custom entity types at runtime without code changes')
    .addTag('Queries', 'Pre-built tenant-scoped and cross-tenant queries')
    .addTag('Schema', 'Inspect database schema, labels, properties, constraints, and indexes')
    .addTag('Data', 'Fetch all nodes and relationships by tenant or globally')
    .addTag('Search', 'Dynamic search across entities with filters, ranges, relationships, facets, aggregations, and autocomplete')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customCss: `
      .swagger-ui { background-color: #1a1a1a; }
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { color: #e0e0e0; }
      .swagger-ui .info .title { color: #ffffff; }
      .swagger-ui .scheme-container { background: #2a2a2a; }
      .swagger-ui .opblock-tag { color: #ffffff; border-color: #4a4a4a; }
      .swagger-ui .opblock { background: #2a2a2a; border-color: #4a4a4a; }
      .swagger-ui .opblock .opblock-summary { border-color: #4a4a4a; }
      .swagger-ui .opblock .opblock-summary-description { color: #e0e0e0; }
      .swagger-ui .opblock .opblock-summary-path { color: #61affe; }
      .swagger-ui .opblock-description-wrapper p { color: #e0e0e0; }
      .swagger-ui .opblock-body pre { background: #1a1a1a; color: #e0e0e0; }
      .swagger-ui .response-col_status { color: #e0e0e0; }
      .swagger-ui .response-col_description { color: #e0e0e0; }
      .swagger-ui table thead tr th { color: #e0e0e0; border-color: #4a4a4a; }
      .swagger-ui table tbody tr td { color: #e0e0e0; border-color: #4a4a4a; }
      .swagger-ui .parameter__name { color: #e0e0e0; }
      .swagger-ui .parameter__type { color: #61affe; }
      .swagger-ui .model-box { background: #2a2a2a; }
      .swagger-ui .model { color: #e0e0e0; }
      .swagger-ui .model-title { color: #ffffff; }
      .swagger-ui .prop-type { color: #61affe; }
      .swagger-ui .renderedMarkdown p { color: #e0e0e0; }
      .swagger-ui section.models { border-color: #4a4a4a; }
      .swagger-ui section.models .model-container { background: #2a2a2a; }
      .swagger-ui .btn { color: #ffffff; border-color: #4a4a4a; }
      .swagger-ui .authorization__btn { color: #49cc90; border-color: #49cc90; }
      .swagger-ui input[type=text], .swagger-ui textarea, .swagger-ui select { 
        background: #2a2a2a; 
        color: #e0e0e0; 
        border-color: #4a4a4a; 
      }
      .swagger-ui .responses-inner h4, .swagger-ui .responses-inner h5 { color: #e0e0e0; }
    `,
    customSiteTitle: 'Knowledge Graph API - Documentation',
  });

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
║   Swagger Documentation     →  http://localhost:${port}/api/docs  ║
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

  SEARCH  (dynamic, config-driven)
    GET   /api/search/:entityType?q=john&fields=first_name,last_name&limit=50
    GET   /api/search/:entityType/autocomplete?q=jo&field=first_name&limit=10
    POST  /api/search/:entityType/query
    POST  /api/search/init-indexes

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

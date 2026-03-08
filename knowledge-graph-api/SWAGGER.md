# Swagger/OpenAPI Documentation

## Overview

The Knowledge Graph API now includes comprehensive Swagger/OpenAPI documentation for all endpoints.

## Installation

First, install the required dependency:

```bash
npm install --save @nestjs/swagger
```

## Accessing the Documentation

Once the API is running, you can access the interactive Swagger UI at:

```
http://localhost:3000/api/docs
```

## Features

### API Tags/Categories

- **Entities** - Standard entity CRUD operations (Person, Organization, Location, Skill, Education, Course, Department)
- **Relationships** - Create and manage tenant-scoped relationships between entities
- **Promotions** - Promote Person nodes to subtypes (Student, Employee, Resident, Researcher)
- **Dynamic** - Create and manage custom entity types at runtime without code changes
- **Queries** - Pre-built tenant-scoped and cross-tenant queries
- **Schema** - Inspect database schema, labels, properties, constraints, and indexes
- **Data** - Fetch all nodes and relationships by tenant or globally
- **Search** - Full-text search across entities

### Interactive Testing

The Swagger UI allows you to:
- Browse all available endpoints
- View request/response schemas
- Test API calls directly from the browser
- See example request bodies
- View response codes and descriptions

## API Documentation Highlights

### Data Endpoints (New)

- `GET /api/data/tenant/:tenantId` - Get all nodes connected to a specific tenant
- `GET /api/data/relationships/tenant/:tenantId` - Get all relationships for a tenant
- `GET /api/data/all` - Get complete graph data (use with caution on large databases)

### Schema Endpoints

- `GET /api/schema` - Full schema snapshot
- `GET /api/schema/labels` - All node labels
- `GET /api/schema/labels/:label/properties` - Properties for a specific label
- `GET /api/schema/relationship-types` - All relationship types
- `GET /api/schema/constraints` - Database constraints
- `GET /api/schema/tenants` - All tenant IDs

### Entity Endpoints (Generic)

Each entity type (Person, Organization, Location, etc.) supports:
- `POST /api/{entity}` - Create/Update
- `GET /api/{entity}` - List all
- `GET /api/{entity}/:id` - Get by ID
- `PUT /api/{entity}/:id` - Update
- `DELETE /api/{entity}/:id` - Delete

### Relationship Endpoints

All relationship types (ENROLLED_IN, WORKS_AT, LIVES_IN, etc.):
- `POST /api/relationships/{type}` - Create relationship
- `DELETE /api/relationships/{type}/:fromId/:toId/:tenantId` - Delete relationship
- `GET /api/relationships/person/:strongId` - Get all relationships for a person

### Promotion Endpoints

- `GET /api/promotions/person/:strongId/labels` - Get person labels
- `GET /api/promotions/person/:strongId/typed-properties` - Get properties grouped by type
- `POST /api/promotions/person/:strongId/student` - Promote to Student
- `POST /api/promotions/person/:strongId/employee` - Promote to Employee
- `POST /api/promotions/person/:strongId/resident` - Promote to Resident
- `POST /api/promotions/person/:strongId/researcher` - Promote to Researcher

### Dynamic Endpoints

Runtime entity creation without code changes:
- `POST /api/dynamic/nodes` - Create new entity type
- `GET /api/dynamic/nodes/:label` - Get all nodes of a custom type
- `POST /api/dynamic/relationships` - Create custom relationship

### Search Endpoints

Full-text Lucene search:
- `GET /api/search/persons?q=john*` - Search persons
- `GET /api/search/organizations?q=microsoft` - Search organizations
- `GET /api/search/advanced?entity=person&q=john*` - Advanced search

## Example Usage

### From Swagger UI

1. Navigate to `http://localhost:3000/api/docs`
2. Expand any endpoint category
3. Click "Try it out" on an endpoint
4. Fill in parameters/body
5. Click "Execute"
6. View the response

### From Code/Postman

All endpoints documented in Swagger are also available via:
- Postman collection: `KnowledgeGraph.postman_collection.json`
- Direct HTTP calls to `http://localhost:3000/api/*`

## Export OpenAPI Specification

The OpenAPI specification is automatically generated from the code decorators and can be accessed as JSON at:

```
http://localhost:3000/api/docs-json
```

This can be imported into:
- Postman
- Insomnia
- API Gateway tools
- Code generators (OpenAPI Generator, Swagger Codegen)

## Support

For questions or issues with the API documentation, please refer to:
- [NestJS Swagger Documentation](https://docs.nestjs.com/openapi/introduction)
- Main API README: `README.md`

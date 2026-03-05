# Knowledge Graph Admin API

NestJS REST API over the multi-tenant Neo4j knowledge graph.
No auth for now — every endpoint is open for Postman testing.

---

## Prerequisites

- Node.js 18+
- Neo4j Desktop running locally (bolt://localhost:7687)
- The C# project seeded at least once (optional — API works on empty graph too)

---

## Setup

```bash
cd knowledge-graph-api
npm install
```

Set your Neo4j password (default is "password"):

```bash
export NEO4J_PASSWORD=your-password
# Windows:
set NEO4J_PASSWORD=your-password
```

Or edit `src/neo4j/neo4j.service.ts` directly:
```ts
private readonly password = 'your-password';
```

Start the API:
```bash
npm run start:dev
```

API runs at: **http://localhost:3000/api**

---

## Import Postman Collection

1. Open Postman
2. Click Import
3. Select `KnowledgeGraph.postman_collection.json`
4. All requests are ready to fire

---

## Endpoint Summary

### Base Entities  `/api/persons` `/api/organizations` etc.
Standard CRUD — POST creates/updates, GET lists or gets one, PUT updates, DELETE removes.

### Relationships  `/api/relationships/*`
Creates tenant-scoped relationships between existing nodes.
All require a `tenantId` in the body.

### Subtype Promotions  `/api/promotions/person/:strongId/*`
Adds a subtype label (`:Student`, `:Employee`, `:Resident`, `:Researcher`)
and sets subtype-specific fields on a Person node.
The Person label is never removed — labels are additive.

### Dynamic Entities  `/api/dynamic/*`
**This is the key endpoint for brand-new types that don't exist in the schema yet.**

Create a node of any type:
```json
POST /api/dynamic/nodes
{
  "labels": ["Volunteer"],
  "idField": "volunteer_id",
  "id": "vol-001",
  "createConstraint": true,
  "properties": {
    "name": "Community Helper",
    "hours_committed": 40,
    "tenant_id": "tenant_ngo"
  }
}
```

Connect any two nodes with any relationship type:
```json
POST /api/dynamic/relationships
{
  "fromLabel": "Person",
  "fromIdField": "strong_id",
  "fromId": "person-sarah-chen",
  "toLabel": "Volunteer",
  "toIdField": "volunteer_id",
  "toId": "vol-001",
  "type": "IS_VOLUNTEER",
  "properties": {
    "tenant_id": "tenant_ngo",
    "role": "Coordinator"
  }
}
```

Add an extra label to any node (dynamic promotion):
```json
POST /api/dynamic/nodes/Volunteer/volunteer_id/vol-001/labels
{ "newLabel": "CommunityProgram" }
```

### Queries  `/api/query/*`
Read-only. Tenant-scoped, cross-tenant, and global queries.

### Schema  `/api/schema/*`
Live introspection of the graph. Shows what labels, relationship types,
properties, and constraints currently exist — including any dynamic ones
created at runtime.

---

## Dynamic Type Rules

Label and relationship type names must match: `[a-zA-Z][a-zA-Z0-9_]*`
Property keys follow the same rule.
Property values are always parameterized — no injection risk.

Setting `createConstraint: true` creates a uniqueness constraint for the
`idField` on the first label. Safe to set every time — uses IF NOT EXISTS.

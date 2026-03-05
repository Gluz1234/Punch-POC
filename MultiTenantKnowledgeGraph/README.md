# Multi-Tenant Ontology-Driven Knowledge Graph PoC

A proof of concept demonstrating a **multi-tenant knowledge graph** built with:

- **C# / .NET 8**
- **Neo4j Community Edition** (local)
- **Official Neo4j .NET Driver 5.x**
- **Async Cypher queries** (no ORM)

---

## Architecture Overview

```
Program.cs
  └── Services/           ← Business logic, validation
        ├── PersonService
        ├── OrganizationService
        ├── LocationService
        ├── SkillService
        ├── EducationService
        ├── RelationshipService
        └── TenantQueryService   ← Tenant-scoped & cross-tenant queries
  └── Repositories/       ← Cypher queries against Neo4j
        ├── Neo4jService         ← Driver + schema bootstrap
        ├── PersonRepository
        ├── OrganizationRepository
        ├── EntityRepositories   ← Location, Skill, Education
        └── RelationshipRepository
  └── Models/
        ├── Person.cs
        ├── Organization.cs
        ├── Location.cs
        ├── Skill.cs
        ├── Education.cs
        └── Relationships/
              └── TenantRelationships.cs
  └── Seed/
        └── DemoSeeder.cs        ← Full PoC demonstration scenario
```

---

## Multi-Tenancy Design

### Core Principle
**Tenant isolation is logical, not physical.**

- One shared Neo4j database
- Shared node types: `Person`, `Organization`, `Skill`, `Location`, `Education`
- `tenant_id` is stored **on relationships**, never on nodes
- A `Person` node exists once globally, identified by `strong_id`
- Multiple tenants can each hold their own relationship to the same person

### Example

```
Person [strong_id=person-123]
  ──[ENROLLED_IN, tenant_id=university_A]──► Organization [MIT]
  ──[WORKS_AT,    tenant_id=employer_B]────► Organization [Acme Corp]
  ──[HAS_SKILL,   tenant_id=university_A]──► Skill [Java]
  ──[HAS_SKILL,   tenant_id=employer_B]────► Skill [C#]
```

### Query Types

| Type | Description | Cypher filter |
|------|-------------|---------------|
| **Tenant-scoped** | Data visible to one tenant only | `WHERE r.tenant_id = $tenantId` |
| **Cross-tenant** | Joins relationships across tenants | Two `MATCH` clauses, each with different `tenant_id` |
| **Global** | No filter — full graph | No `WHERE` on `tenant_id` |

---

## Prerequisites

### 1. Install .NET 8 SDK
```
https://dotnet.microsoft.com/download/dotnet/8.0
```

### 2. Install Neo4j Community Edition

**Option A: Neo4j Desktop (recommended)**
```
https://neo4j.com/download/
```

**Option B: Manual / CLI**
```bash
# macOS (Homebrew)
brew install neo4j

# Ubuntu/Debian
sudo apt install neo4j

# Windows: download installer from neo4j.com
```

### 3. Start Neo4j and set password
```bash
# Start
neo4j start            # or use Neo4j Desktop: click "Start"

# Open browser UI
open http://localhost:7474

# Default credentials: neo4j / neo4j
# You'll be prompted to set a new password on first login
```

---

## Configuration

Edit the password in `Program.cs`:

```csharp
var config = new Neo4jConfig
{
    Uri      = "bolt://localhost:7687",
    Username = "neo4j",
    Password = "your-password-here"   // ← change this
};
```

Or edit `Configuration/Neo4jConfig.cs` to change defaults.

---

## Run

```bash
cd MultiTenantKnowledgeGraph
dotnet restore
dotnet run
```

---

## Expected Output

```
=================================================
  Multi-Tenant Knowledge Graph PoC (.NET 8 + Neo4j)
=================================================

Ensuring Neo4j schema constraints...
[Neo4j] Schema constraints verified.

──────────────────────────────────────────────────
  PHASE 1: Creating Base Entities
──────────────────────────────────────────────────
  ✓ Created: Organization [org-mit]: Massachusetts Institute of Technology (University)
  ✓ Created: Organization [org-acme]: Acme Corporation (Company)
  ✓ Created: Location [loc-amsterdam]: Amsterdam (City)
  ✓ Created: Skill [skill-java]: Java
  ✓ Created: Skill [skill-csharp]: C#
  ✓ Created: Education [edu-cs-degree]: Bachelor of Science in Computer Science (Degree)

──────────────────────────────────────────────────
  PHASE 2: Creating Person (Identity Rule Demo)
──────────────────────────────────────────────────
  ✓ Upserted: Person [person-123]: John Doe
  ✓ Re-upserted same person with new email (no duplicate created)
  → Total Person nodes in graph: 1 (should be 1)

──────────────────────────────────────────────────
  PHASE 3: Creating Tenant-Scoped Relationships
──────────────────────────────────────────────────
  ✓ [university_A] person-123 ENROLLED_IN org-mit
  ✓ [employer_B] person-123 WORKS_AT org-acme
  ...

──────────────────────────────────────────────────
  PHASE 5: Cross-Tenant Query
──────────────────────────────────────────────────
  Query: 'Persons enrolled at org-mit [tenant: university_A]
          AND working at org-acme [tenant: employer_B]'
    → John Doe [id: person-123] | Student (Computer Science MSc) + Employee (Senior Software Engineer)
```

---

## Schema Constraints (Auto-Applied on Startup)

| Label | Property | Constraint |
|-------|----------|------------|
| `Person` | `strong_id` | UNIQUE |
| `Organization` | `org_id` | UNIQUE |
| `Location` | `location_id` | UNIQUE |
| `Skill` | `skill_id` | UNIQUE |
| `Education` | `education_id` | UNIQUE |

---

## Verify in Neo4j Browser

Visit `http://localhost:7474` and run:

```cypher
-- See all nodes
MATCH (n) RETURN n LIMIT 50

-- Verify one Person node (despite two tenants)
MATCH (p:Person) RETURN count(p)

-- See all relationships for person-123
MATCH (p:Person {strong_id: 'person-123'})-[r]->(n)
RETURN p, type(r), r.tenant_id, n

-- Cross-tenant query
MATCH (p:Person)-[r1:ENROLLED_IN {tenant_id: 'university_A'}]->(o1:Organization)
MATCH (p)-[r2:WORKS_AT {tenant_id: 'employer_B'}]->(o2:Organization)
RETURN p.first_name, p.last_name, o1.name AS university, o2.name AS employer
```

---

## Relationship Types

| Relationship | From → To | Tenant-owned |
|-------------|-----------|--------------|
| `ENROLLED_IN` | Person → Organization | ✓ |
| `WORKS_AT` | Person → Organization | ✓ |
| `LIVES_IN` | Person → Location | ✓ |
| `HAS_SKILL` | Person → Skill | ✓ |
| `COMPLETED` | Person → Education | ✓ |
| `PROVIDED_BY` | Education → Organization | ✓ |
| `REQUIRES_SKILL` | Organization → Skill | ✓ |

All tenant-owned relationships carry: `tenant_id` (string) + `created_at` (ISO timestamp)

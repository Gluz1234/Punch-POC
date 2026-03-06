using MultiTenantKnowledgeGraph.Configuration;
using MultiTenantKnowledgeGraph.Repositories;
using MultiTenantKnowledgeGraph.Services;
using MultiTenantKnowledgeGraph.Seed;

// ══════════════════════════════════════════════════════════════════════════════
// MULTI-TENANT ONTOLOGY-DRIVEN KNOWLEDGE GRAPH
// PoC Entry Point
//
// Architecture:
//   Program.cs
//     └── Services (business logic + validation)
//           └── Repositories (Cypher queries against Neo4j)
//                 └── Neo4jService (driver + schema bootstrap)
//
// Multi-Tenancy Model:
//   Shared nodes (Person, Organization, Skill, Location, Education)
//   Tenant context stored on RELATIONSHIPS via tenant_id property
//   No node duplication — identity resolved by strong_id MERGE
// ══════════════════════════════════════════════════════════════════════════════

Console.WriteLine("=================================================");
Console.WriteLine("  Multi-Tenant Knowledge Graph PoC (.NET 8 + Neo4j)");
Console.WriteLine("=================================================");

// ── Configuration ──────────────────────────────────────────────────────────
// Edit Neo4jConfig defaults, or override here:
var config = new Neo4jConfig
{
    Uri      = "neo4j://127.0.0.1:7687",
    Username = "neo4j",
    Password = "password" 
};

// ── Dependency Wiring (manual DI — no framework required) ─────────────────
var neo4jService = new Neo4jService(config);

// All standard entity repositories now use the generic base class
var personRepo       = new PersonRepository(neo4jService);
var orgRepo          = new OrganizationRepository(neo4jService);
var locationRepo     = new LocationRepository(neo4jService);
var skillRepo        = new SkillRepository(neo4jService);
var educationRepo    = new EducationRepository(neo4jService);
var courseRepo       = new CourseRepository(neo4jService);
var departmentRepo   = new DepartmentRepository(neo4jService);
var relationshipRepo = new RelationshipRepository(neo4jService);

// Services
var personService       = new PersonService(personRepo);
var orgService          = new OrganizationService(orgRepo);
var locationService     = new LocationService(locationRepo);
var skillService        = new SkillService(skillRepo);
var educationService    = new EducationService(educationRepo);
var relService          = new RelationshipService(relationshipRepo);
var queryService        = new TenantQueryService(neo4jService);

// Subtype promotion services
var promotionRepo       = new PromotionRepository(neo4jService);
var promotionService    = new PromotionService(promotionRepo);

try
{
    // ── Schema bootstrap ───────────────────────────────────────────────────
    Console.WriteLine("\nEnsuring Neo4j schema constraints...");
    await neo4jService.EnsureConstraintsAsync();

    // ── Run the PoC demo scenario ──────────────────────────────────────────
    await DemoSeeder.RunAsync(
        personService,
        orgService,
        locationService,
        skillService,
        educationService,
        relService,
        queryService,
        promotionService
    );
}
catch (Neo4j.Driver.AuthenticationException)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine("\n[ERROR] Neo4j authentication failed.");
    Console.WriteLine("  → Check that Neo4j is running: neo4j status");
    Console.WriteLine("  → Update the password in Program.cs or Configuration/Neo4jConfig.cs");
    Console.ResetColor();
}
catch (Neo4j.Driver.ServiceUnavailableException)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine("\n[ERROR] Cannot connect to Neo4j at bolt://localhost:7687");
    Console.WriteLine("  → Start Neo4j: neo4j start  (or via Neo4j Desktop)");
    Console.WriteLine("  → Ensure port 7687 is open");
    Console.ResetColor();
}
catch (Exception ex)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine($"\n[ERROR] {ex.GetType().Name}: {ex.Message}");
    Console.ResetColor();
    throw;
}
finally
{
    neo4jService.Dispose();
}

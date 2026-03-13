using Neo4j.Driver;
using MultiTenantKnowledgeGraph.Configuration;

namespace MultiTenantKnowledgeGraph.Repositories;

/// <summary>
/// Wraps the Neo4j IDriver lifecycle.
/// Registers database uniqueness constraints on startup.
/// Disposed at application shutdown.
/// </summary>
public class Neo4jService : IDisposable
{
    private readonly IDriver _driver;

    /// <summary>Exposes the raw driver for services that need direct session control.</summary>
    internal IDriver Driver => _driver;

    public Neo4jService(Neo4jConfig config)
    {
        _driver = GraphDatabase.Driver(
            config.Uri,
            AuthTokens.Basic(config.Username, config.Password)
        );
    }

    /// <summary>
    /// Returns a new async session. Callers are responsible for disposing it.
    /// </summary>
    public IAsyncSession OpenSession() => _driver.AsyncSession();

    /// <summary>
    /// Bootstraps the graph schema: creates uniqueness constraints for all base entity types.
    /// Safe to call on every startup — uses CREATE CONSTRAINT IF NOT EXISTS.
    /// </summary>
    public async Task EnsureConstraintsAsync()
    {
        await using var session = OpenSession();

                var migrationQueries = new[]
                {
                        @"MATCH (n)
                            WHERE n:Person OR n:Organization OR n:Location OR n:Skill OR n:Education OR n:Course OR n:Department
                            SET n:Entity",
                        @"MATCH (n)
                            WHERE (n:Person OR n:Organization OR n:Location OR n:Skill OR n:Education OR n:Course OR n:Department)
                                AND n.entity_id IS NULL
                            SET n.entity_id = coalesce(
                                n.strong_id,
                                n.org_id,
                                n.location_id,
                                n.skill_id,
                                n.education_id,
                                n.course_id,
                                n.department_id,
                                n.id,
                                randomUUID()
                            )",
                        @"MATCH (n:Entity)
                            WHERE n.entity_id IS NOT NULL
                            WITH n.entity_id AS entityId, collect(n) AS nodes
                            WHERE size(nodes) > 1
                            FOREACH (x IN tail(nodes) | SET x.entity_id = randomUUID())"
                };

                foreach (var cypher in migrationQueries)
                {
                        await session.RunAsync(cypher);
                }

        var constraints = new[]
        {
            "CREATE CONSTRAINT entity_entity_id       IF NOT EXISTS FOR (e:Entity)       REQUIRE e.entity_id IS UNIQUE",
            "CREATE CONSTRAINT person_entity_id       IF NOT EXISTS FOR (p:Person)       REQUIRE p.entity_id IS UNIQUE",
            "CREATE CONSTRAINT organization_entity_id IF NOT EXISTS FOR (o:Organization) REQUIRE o.entity_id IS UNIQUE",
            "CREATE CONSTRAINT location_entity_id     IF NOT EXISTS FOR (l:Location)     REQUIRE l.entity_id IS UNIQUE",
            "CREATE CONSTRAINT skill_entity_id        IF NOT EXISTS FOR (s:Skill)        REQUIRE s.entity_id IS UNIQUE",
            "CREATE CONSTRAINT education_entity_id    IF NOT EXISTS FOR (e:Education)    REQUIRE e.entity_id IS UNIQUE",
            "CREATE CONSTRAINT course_entity_id       IF NOT EXISTS FOR (c:Course)       REQUIRE c.entity_id IS UNIQUE",
            "CREATE CONSTRAINT department_entity_id   IF NOT EXISTS FOR (d:Department)   REQUIRE d.entity_id IS UNIQUE",
            // SubtypeInstance lookup index — MERGE prevents duplicates at app level
            "CREATE INDEX subtype_instance_lookup IF NOT EXISTS FOR (si:SubtypeInstance) ON (si.owner_tenant_id, si.parent_entity_id)",
        };

        foreach (var cypher in constraints)
        {
            await session.RunAsync(cypher);
        }

        Console.WriteLine("[Neo4j] Schema constraints verified.");
    }

    public void Dispose() => _driver.Dispose();
}

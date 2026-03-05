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

        var constraints = new[]
        {
            "CREATE CONSTRAINT person_strong_id IF NOT EXISTS FOR (p:Person)      REQUIRE p.strong_id    IS UNIQUE",
            "CREATE CONSTRAINT org_id           IF NOT EXISTS FOR (o:Organization) REQUIRE o.org_id       IS UNIQUE",
            "CREATE CONSTRAINT location_id      IF NOT EXISTS FOR (l:Location)     REQUIRE l.location_id  IS UNIQUE",
            "CREATE CONSTRAINT skill_id         IF NOT EXISTS FOR (s:Skill)        REQUIRE s.skill_id     IS UNIQUE",
            "CREATE CONSTRAINT education_id     IF NOT EXISTS FOR (e:Education)    REQUIRE e.education_id IS UNIQUE",
            "CREATE CONSTRAINT course_id        IF NOT EXISTS FOR (c:Course)       REQUIRE c.course_id    IS UNIQUE",
            "CREATE CONSTRAINT department_id    IF NOT EXISTS FOR (d:Department)   REQUIRE d.department_id IS UNIQUE",
        };

        foreach (var cypher in constraints)
        {
            await session.RunAsync(cypher);
        }

        Console.WriteLine("[Neo4j] Schema constraints verified.");
    }

    public void Dispose() => _driver.Dispose();
}

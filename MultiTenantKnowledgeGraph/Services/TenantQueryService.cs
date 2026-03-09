using Neo4j.Driver;
using MultiTenantKnowledgeGraph.Models;

namespace MultiTenantKnowledgeGraph.Services;

/// <summary>
/// Provides multi-tenant query capabilities:
///
/// 1. TENANT-SCOPED QUERY
///    Returns data visible only within a specific tenant context.
///    Achieved by filtering WHERE r.tenant_id = $tenantId
///
/// 2. CROSS-TENANT QUERY
///    Finds entities that appear in multiple different tenant contexts.
///    Joins across relationship sets from different tenants.
///
/// 3. GLOBAL QUERY
///    No tenant filter — searches the entire graph.
///    Useful for ontology-level queries (e.g., "all persons with skill X").
/// </summary>
public class TenantQueryService
{
    private readonly Neo4j.Driver.IDriver _driver;

    // Inject the raw driver so we can manage sessions directly
    public TenantQueryService(Repositories.Neo4jService neo4j)
    {
        _driver = neo4j.Driver;
    }

    // ──────────────────────────────────────────
    // TENANT-SCOPED QUERIES
    // ──────────────────────────────────────────

    /// <summary>
    /// Returns all persons enrolled in a specific organization, scoped to a tenant.
    /// Example: "All students enrolled at University A visible to tenant university_A"
    /// </summary>
    public async Task<List<(Person Person, string Program)>> GetPersonsEnrolledInOrgAsync(
        string orgId, string tenantId)
    {
        const string cypher = @"
            MATCH (p:Person)-[r:ENROLLED_IN {tenant_id: $tenantId}]->(o:Organization {entity_id: $orgId})
            RETURN p, r.program AS program
            ORDER BY p.last_name, p.first_name";

        await using var session = _driver.AsyncSession();
        var result = await session.RunAsync(cypher, new { orgId, tenantId });

        var list = new List<(Person, string)>();
        await foreach (var record in result)
        {
            var person  = MapPerson(record["p"].As<INode>());
            var program = record["program"].As<string?>() ?? "";
            list.Add((person, program));
        }
        return list;
    }

    /// <summary>
    /// Returns all persons working at an organization, scoped to a tenant.
    /// </summary>
    public async Task<List<(Person Person, string JobTitle)>> GetPersonsWorkingAtOrgAsync(
        string orgId, string tenantId)
    {
        const string cypher = @"
            MATCH (p:Person)-[r:WORKS_AT {tenant_id: $tenantId}]->(o:Organization {entity_id: $orgId})
            RETURN p, r.job_title AS jobTitle
            ORDER BY p.last_name";

        await using var session = _driver.AsyncSession();
        var result = await session.RunAsync(cypher, new { orgId, tenantId });

        var list = new List<(Person, string)>();
        await foreach (var record in result)
        {
            list.Add((MapPerson(record["p"].As<INode>()), record["jobTitle"].As<string?>() ?? ""));
        }
        return list;
    }

    // ──────────────────────────────────────────
    // CROSS-TENANT QUERIES
    // ──────────────────────────────────────────

    /// <summary>
    /// Cross-tenant query: Finds persons who are BOTH:
    ///   - Enrolled in orgA (under tenant tenantA), AND
    ///   - Working at orgB (under tenant tenantB)
    ///
    /// This is only possible because the Person node is shared across tenants.
    /// The same entity_id appears in both relationship contexts.
    ///
    /// Use case: "Find all persons who are university students AND employed by Company B"
    /// </summary>
    public async Task<List<(Person Person, string Program, string JobTitle)>> GetPersonsEnrolledAndWorkingAsync(
        string enrolledInOrgId, string enrolledTenantId,
        string worksAtOrgId,    string worksTenantId)
    {
        // The key insight: both match clauses share the same (p:Person) node variable.
        // Neo4j will only return persons where BOTH relationship patterns match.
        const string cypher = @"
            MATCH (p:Person)-[enrollment:ENROLLED_IN {tenant_id: $enrollTenant}]
                  ->(o1:Organization {entity_id: $enrollOrgId})
            MATCH (p)         -[employment:WORKS_AT   {tenant_id: $worksTenant}]
                  ->(o2:Organization {entity_id: $worksOrgId})
            RETURN p,
                   enrollment.program   AS program,
                   employment.job_title AS jobTitle
            ORDER BY p.last_name";

        await using var session = _driver.AsyncSession();
        var result = await session.RunAsync(cypher, new
        {
            enrollOrgId  = enrolledInOrgId,
            enrollTenant = enrolledTenantId,
            worksOrgId   = worksAtOrgId,
            worksTenant  = worksTenantId
        });

        var list = new List<(Person, string, string)>();
        await foreach (var record in result)
        {
            list.Add((
                MapPerson(record["p"].As<INode>()),
                record["program"].As<string?>()  ?? "",
                record["jobTitle"].As<string?>() ?? ""
            ));
        }
        return list;
    }

    // ──────────────────────────────────────────
    // GLOBAL QUERIES (no tenant filter)
    // ──────────────────────────────────────────

    /// <summary>
    /// Global query: Returns all persons who have a specific skill, regardless of tenant.
    /// Use case: "List all persons in the entire graph who know Java"
    /// </summary>
    public async Task<List<(Person Person, string TenantId, string ProficiencyLevel)>> GetPersonsWithSkillAsync(
        string skillId)
    {
        const string cypher = @"
            MATCH (p:Person)-[r:HAS_SKILL]->(s:Skill {entity_id: $skillId})
            RETURN p, r.tenant_id AS tenantId, r.proficiency_level AS level
            ORDER BY p.last_name";

        await using var session = _driver.AsyncSession();
        var result = await session.RunAsync(cypher, new { skillId });

        var list = new List<(Person, string, string)>();
        await foreach (var record in result)
        {
            list.Add((
                MapPerson(record["p"].As<INode>()),
                record["tenantId"].As<string?>() ?? "",
                record["level"].As<string?>()    ?? ""
            ));
        }
        return list;
    }

    /// <summary>
    /// Global query: Returns all persons living in a location, across all tenants.
    /// </summary>
    public async Task<List<(Person Person, string TenantId)>> GetPersonsLivingInLocationAsync(string locationId)
    {
        const string cypher = @"
            MATCH (p:Person)-[r:LIVES_IN]->(l:Location {entity_id: $locationId})
            RETURN p, r.tenant_id AS tenantId
            ORDER BY p.last_name";

        await using var session = _driver.AsyncSession();
        var result = await session.RunAsync(cypher, new { locationId });

        var list = new List<(Person, string)>();
        await foreach (var record in result)
            list.Add((MapPerson(record["p"].As<INode>()), record["tenantId"].As<string?>() ?? ""));
        return list;
    }

    /// <summary>
    /// Returns all tenants that have a relationship with a specific person.
    /// Useful for understanding which tenants "know about" a given individual.
    /// </summary>
    public async Task<List<string>> GetTenantsForPersonAsync(string entityId)
    {
        const string cypher = @"
            MATCH (p:Person {entity_id: $entityId})-[r]->()
            WHERE r.tenant_id IS NOT NULL
            RETURN DISTINCT r.tenant_id AS tenantId
            ORDER BY tenantId";

        await using var session = _driver.AsyncSession();
        var result = await session.RunAsync(cypher, new { entityId });

        var tenants = new List<string>();
        await foreach (var record in result)
            tenants.Add(record["tenantId"].As<string>());
        return tenants;
    }

    // ──────────────────────────────────────────
    // HELPERS
    // ──────────────────────────────────────────

    private static Person MapPerson(INode node) => new()
    {
        EntityId    = node["entity_id"].As<string>(),
        FirstName   = node["first_name"].As<string>(),
        LastName    = node["last_name"].As<string>(),
        Email       = node.Properties.ContainsKey("email") ? node["email"].As<string?>() : null,
        Status      = node.Properties.ContainsKey("status") ? node["status"].As<string?>() : null,
    };
}

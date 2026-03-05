using Neo4j.Driver;
using MultiTenantKnowledgeGraph.Models.Relationships;

namespace MultiTenantKnowledgeGraph.Repositories;

/// <summary>
/// Manages all tenant-scoped relationships between nodes.
///
/// TENANCY DESIGN EXPLAINED:
/// ─────────────────────────
/// Rather than physically separating tenant data into different databases or
/// duplicating shared nodes (Person, Skill, etc.), we store tenant_id on
/// the RELATIONSHIP itself.
///
/// This means:
///   - One Person node [strong_id=123] exists once in the graph.
///   - Multiple tenants can each have a relationship TO that person.
///   - Tenant-scoped queries filter WHERE r.tenant_id = $tenantId
///   - Cross-tenant queries omit the tenant filter entirely.
///
/// This is the "logical multi-tenancy via relationship properties" pattern.
/// </summary>
public class RelationshipRepository
{
    private readonly Neo4jService _neo4j;

    public RelationshipRepository(Neo4jService neo4j) => _neo4j = neo4j;

    // ──────────────────────────────────────────
    // ENROLLED_IN  (Person → Organization)
    // ──────────────────────────────────────────

    public async Task CreateEnrolledInAsync(EnrolledInRelationship rel)
    {
        // MERGE prevents duplicate relationships for the same person+org+tenant.
        // ON CREATE SET stamps created_at only once.
        const string cypher = @"
            MATCH (p:Person {strong_id: $personId})
            MATCH (o:Organization {org_id: $orgId})
            MERGE (p)-[r:ENROLLED_IN {tenant_id: $tenantId, org_id: $orgId}]->(o)
            ON CREATE SET
                r.created_at = $createdAt,
                r.start_date = $startDate,
                r.program    = $program
            RETURN r";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            personId  = rel.PersonStrongId,
            orgId     = rel.OrgId,
            tenantId  = rel.TenantId,
            createdAt = rel.CreatedAt.ToString("o"),
            startDate = rel.StartDate?.ToString("o"),
            program   = rel.Program
        });
        await result.ConsumeAsync();
    }

    public async Task DeleteEnrolledInAsync(string personStrongId, string orgId, string tenantId)
    {
        const string cypher = @"
            MATCH (p:Person {strong_id: $personId})-[r:ENROLLED_IN {tenant_id: $tenantId, org_id: $orgId}]->(o:Organization)
            DELETE r";

        await using var session = _neo4j.OpenSession();
        await session.RunAsync(cypher, new { personId = personStrongId, orgId, tenantId });
    }

    // ──────────────────────────────────────────
    // WORKS_AT  (Person → Organization)
    // ──────────────────────────────────────────

    public async Task CreateWorksAtAsync(WorksAtRelationship rel)
    {
        const string cypher = @"
            MATCH (p:Person {strong_id: $personId})
            MATCH (o:Organization {org_id: $orgId})
            MERGE (p)-[r:WORKS_AT {tenant_id: $tenantId, org_id: $orgId}]->(o)
            ON CREATE SET
                r.created_at = $createdAt,
                r.job_title  = $jobTitle,
                r.start_date = $startDate
            RETURN r";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            personId  = rel.PersonStrongId,
            orgId     = rel.OrgId,
            tenantId  = rel.TenantId,
            createdAt = rel.CreatedAt.ToString("o"),
            jobTitle  = rel.JobTitle,
            startDate = rel.StartDate?.ToString("o")
        });
        await result.ConsumeAsync();
    }

    public async Task DeleteWorksAtAsync(string personStrongId, string orgId, string tenantId)
    {
        const string cypher = @"
            MATCH (p:Person {strong_id: $personId})-[r:WORKS_AT {tenant_id: $tenantId, org_id: $orgId}]->(o:Organization)
            DELETE r";

        await using var session = _neo4j.OpenSession();
        await session.RunAsync(cypher, new { personId = personStrongId, orgId, tenantId });
    }

    // ──────────────────────────────────────────
    // LIVES_IN  (Person → Location)
    // ──────────────────────────────────────────

    public async Task CreateLivesInAsync(LivesInRelationship rel)
    {
        const string cypher = @"
            MATCH (p:Person {strong_id: $personId})
            MATCH (l:Location {location_id: $locationId})
            MERGE (p)-[r:LIVES_IN {tenant_id: $tenantId, location_id: $locationId}]->(l)
            ON CREATE SET
                r.created_at     = $createdAt,
                r.residence_type = $residenceType
            RETURN r";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            personId      = rel.PersonStrongId,
            locationId    = rel.LocationId,
            tenantId      = rel.TenantId,
            createdAt     = rel.CreatedAt.ToString("o"),
            residenceType = rel.ResidenceType
        });
        await result.ConsumeAsync();
    }

    public async Task DeleteLivesInAsync(string personStrongId, string locationId, string tenantId)
    {
        const string cypher = @"
            MATCH (p:Person {strong_id: $personId})-[r:LIVES_IN {tenant_id: $tenantId, location_id: $locationId}]->(l:Location)
            DELETE r";

        await using var session = _neo4j.OpenSession();
        await session.RunAsync(cypher, new { personId = personStrongId, locationId, tenantId });
    }

    // ──────────────────────────────────────────
    // HAS_SKILL  (Person → Skill)
    // ──────────────────────────────────────────

    public async Task CreateHasSkillAsync(HasSkillRelationship rel)
    {
        const string cypher = @"
            MATCH (p:Person {strong_id: $personId})
            MATCH (s:Skill {skill_id: $skillId})
            MERGE (p)-[r:HAS_SKILL {tenant_id: $tenantId, skill_id: $skillId}]->(s)
            ON CREATE SET
                r.created_at        = $createdAt,
                r.proficiency_level = $level
            RETURN r";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            personId = rel.PersonStrongId,
            skillId  = rel.SkillId,
            tenantId = rel.TenantId,
            createdAt = rel.CreatedAt.ToString("o"),
            level    = rel.ProficiencyLevel
        });
        await result.ConsumeAsync();
    }

    public async Task DeleteHasSkillAsync(string personStrongId, string skillId, string tenantId)
    {
        const string cypher = @"
            MATCH (p:Person {strong_id: $personId})-[r:HAS_SKILL {tenant_id: $tenantId, skill_id: $skillId}]->(s:Skill)
            DELETE r";

        await using var session = _neo4j.OpenSession();
        await session.RunAsync(cypher, new { personId = personStrongId, skillId, tenantId });
    }

    // ──────────────────────────────────────────
    // COMPLETED  (Person → Education)
    // ──────────────────────────────────────────

    public async Task CreateCompletedAsync(CompletedRelationship rel)
    {
        const string cypher = @"
            MATCH (p:Person {strong_id: $personId})
            MATCH (e:Education {education_id: $educationId})
            MERGE (p)-[r:COMPLETED {tenant_id: $tenantId, education_id: $educationId}]->(e)
            ON CREATE SET r.created_at = $createdAt
            RETURN r";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            personId    = rel.PersonStrongId,
            educationId = rel.EducationId,
            tenantId    = rel.TenantId,
            createdAt   = rel.CreatedAt.ToString("o")
        });
        await result.ConsumeAsync();
    }

    public async Task DeleteCompletedAsync(string personStrongId, string educationId, string tenantId)
    {
        const string cypher = @"
            MATCH (p:Person {strong_id: $personId})-[r:COMPLETED {tenant_id: $tenantId, education_id: $educationId}]->(e:Education)
            DELETE r";

        await using var session = _neo4j.OpenSession();
        await session.RunAsync(cypher, new { personId = personStrongId, educationId, tenantId });
    }

    // ──────────────────────────────────────────
    // PROVIDED_BY  (Education → Organization)
    // ──────────────────────────────────────────

    public async Task CreateProvidedByAsync(ProvidedByRelationship rel)
    {
        const string cypher = @"
            MATCH (e:Education {education_id: $educationId})
            MATCH (o:Organization {org_id: $orgId})
            MERGE (e)-[r:PROVIDED_BY {tenant_id: $tenantId}]->(o)
            ON CREATE SET r.created_at = $createdAt
            RETURN r";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            educationId = rel.EducationId,
            orgId       = rel.OrgId,
            tenantId    = rel.TenantId,
            createdAt   = rel.CreatedAt.ToString("o")
        });
        await result.ConsumeAsync();
    }

    // ──────────────────────────────────────────
    // REQUIRES_SKILL  (Organization → Skill)
    // ──────────────────────────────────────────

    public async Task CreateRequiresSkillAsync(RequiresSkillRelationship rel)
    {
        const string cypher = @"
            MATCH (o:Organization {org_id: $orgId})
            MATCH (s:Skill {skill_id: $skillId})
            MERGE (o)-[r:REQUIRES_SKILL {tenant_id: $tenantId, skill_id: $skillId}]->(s)
            ON CREATE SET
                r.created_at       = $createdAt,
                r.requirement_level = $reqLevel
            RETURN r";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            orgId    = rel.OrgId,
            skillId  = rel.SkillId,
            tenantId = rel.TenantId,
            createdAt = rel.CreatedAt.ToString("o"),
            reqLevel = rel.RequirementLevel
        });
        await result.ConsumeAsync();
    }

    // ──────────────────────────────────────────
    // LIST ALL RELATIONSHIPS FOR A PERSON
    // ──────────────────────────────────────────

    /// <summary>
    /// Returns a human-readable summary of all relationships for a person,
    /// optionally filtered by tenant.
    /// </summary>
    public async Task<List<string>> ListPersonRelationshipsAsync(string strongId, string? tenantId = null)
    {
        // When tenantId is provided: filter by tenant (tenant-scoped query).
        // When null: return all relationships across all tenants (global query).
        var tenantFilter = tenantId is not null ? "WHERE r.tenant_id = $tenantId" : "";

        var cypher = $@"
            MATCH (p:Person {{strong_id: $strongId}})-[r]->(n)
            {tenantFilter}
            RETURN type(r) AS relType, r.tenant_id AS tenant, labels(n) AS targetLabels,
                   COALESCE(n.name, n.org_id, n.skill_id, n.location_id, n.education_id) AS targetId";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new { strongId, tenantId });

        var lines = new List<string>();
        await foreach (var record in result)
        {
            var relType      = record["relType"].As<string>();
            var tenant       = record["tenant"].As<string?>();
            var targetLabels = record["targetLabels"].As<List<string>>();
            var targetId     = record["targetId"].As<string?>();
            lines.Add($"  [{relType}] → {string.Join(",", targetLabels)} ({targetId}) | tenant: {tenant ?? "n/a"}");
        }
        return lines;
    }
}

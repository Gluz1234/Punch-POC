using Neo4j.Driver;
using MultiTenantKnowledgeGraph.Models;

namespace MultiTenantKnowledgeGraph.Repositories;

/// <summary>
/// Data access layer for Organization nodes.
/// Organizations are shared across tenants — one node per real-world entity.
/// </summary>
public class OrganizationRepository
{
    private readonly Neo4jService _neo4j;

    public OrganizationRepository(Neo4jService neo4j) => _neo4j = neo4j;

    public async Task<Organization> UpsertAsync(Organization org)
    {
        const string cypher = @"
            MERGE (o:Organization {org_id: $orgId})
            ON CREATE SET
                o.name                = $name,
                o.organization_type   = $orgType,
                o.industry            = $industry,
                o.registration_number = $regNum,
                o.website             = $website,
                o.phone               = $phone
            ON MATCH SET
                o.name                = $name,
                o.organization_type   = $orgType,
                o.industry            = $industry,
                o.registration_number = $regNum,
                o.website             = $website,
                o.phone               = $phone
            RETURN o";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            orgId   = org.OrgId,
            name    = org.Name,
            orgType = org.OrganizationType,
            industry = org.Industry,
            regNum  = org.RegistrationNumber,
            website = org.Website,
            phone   = org.Phone
        });
        await result.ConsumeAsync();
        return org;
    }

    public async Task<Organization?> GetByIdAsync(string orgId)
    {
        const string cypher = "MATCH (o:Organization {org_id: $orgId}) RETURN o";
        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new { orgId });

        if (await result.FetchAsync())
            return MapNode(result.Current["o"].As<INode>());
        return null;
    }

    public async Task<List<Organization>> GetAllAsync()
    {
        const string cypher = "MATCH (o:Organization) RETURN o ORDER BY o.name";
        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher);
        var list = new List<Organization>();
        await foreach (var r in result)
            list.Add(MapNode(r["o"].As<INode>()));
        return list;
    }

    public async Task<bool> DeleteAsync(string orgId)
    {
        const string cypher = @"
            MATCH (o:Organization {org_id: $orgId})
            DETACH DELETE o
            RETURN count(o) AS deleted";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new { orgId });
        var record = await result.SingleAsync();
        return record["deleted"].As<long>() > 0;
    }

    private static Organization MapNode(INode node) => new()
    {
        OrgId              = node["org_id"].As<string>(),
        Name               = node["name"].As<string>(),
        OrganizationType   = node["organization_type"].As<string>(),
        Industry           = node.Properties.ContainsKey("industry")            ? node["industry"].As<string?>()            : null,
        RegistrationNumber = node.Properties.ContainsKey("registration_number") ? node["registration_number"].As<string?>() : null,
        Website            = node.Properties.ContainsKey("website")             ? node["website"].As<string?>()             : null,
        Phone              = node.Properties.ContainsKey("phone")               ? node["phone"].As<string?>()               : null,
    };
}

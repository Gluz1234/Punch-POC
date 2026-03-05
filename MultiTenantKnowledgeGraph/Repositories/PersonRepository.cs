using Neo4j.Driver;
using MultiTenantKnowledgeGraph.Models;

namespace MultiTenantKnowledgeGraph.Repositories;

/// <summary>
/// Data access layer for Person nodes.
///
/// IDENTITY RULE enforced here:
/// All writes use MERGE on strong_id. This guarantees that even if two
/// different tenants "register" the same person, only one Person node
/// ever exists in the graph. Properties are updated via ON MATCH/ON CREATE.
/// </summary>
public class PersonRepository
{
    private readonly Neo4jService _neo4j;

    public PersonRepository(Neo4jService neo4j) => _neo4j = neo4j;

    // ──────────────────────────────────────────
    // CREATE / UPSERT
    // ──────────────────────────────────────────

    /// <summary>
    /// Creates or updates a Person by strong_id.
    /// Uses MERGE to guarantee uniqueness — never creates duplicates.
    /// </summary>
    public async Task<Person> UpsertAsync(Person person)
    {
        const string cypher = @"
            MERGE (p:Person {strong_id: $strongId})
            ON CREATE SET
                p.first_name   = $firstName,
                p.last_name    = $lastName,
                p.birth_date   = $birthDate,
                p.email        = $email,
                p.phone        = $phone,
                p.nationality  = $nationality,
                p.status       = $status
            ON MATCH SET
                p.first_name   = $firstName,
                p.last_name    = $lastName,
                p.birth_date   = $birthDate,
                p.email        = $email,
                p.phone        = $phone,
                p.nationality  = $nationality,
                p.status       = $status
            RETURN p";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            strongId    = person.StrongId,
            firstName   = person.FirstName,
            lastName    = person.LastName,
            birthDate   = person.BirthDate?.ToString("o"),
            email       = person.Email,
            phone       = person.Phone,
            nationality = person.Nationality,
            status      = person.Status
        });

        await result.ConsumeAsync();
        return person;
    }

    // ──────────────────────────────────────────
    // READ
    // ──────────────────────────────────────────

    public async Task<Person?> GetByStrongIdAsync(string strongId)
    {
        const string cypher = "MATCH (p:Person {strong_id: $strongId}) RETURN p";
        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new { strongId });

        if (await result.FetchAsync())
        {
            return MapNode(result.Current["p"].As<INode>());
        }
        return null;
    }

    public async Task<List<Person>> GetAllAsync()
    {
        const string cypher = "MATCH (p:Person) RETURN p ORDER BY p.last_name, p.first_name";
        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher);
        var persons = new List<Person>();

        await foreach (var record in result)
        {
            persons.Add(MapNode(record["p"].As<INode>()));
        }
        return persons;
    }

    // ──────────────────────────────────────────
    // DELETE
    // ──────────────────────────────────────────

    /// <summary>
    /// Deletes a Person and ALL their relationships.
    /// Use with caution — removes the person from all tenant contexts.
    /// </summary>
    public async Task<bool> DeleteAsync(string strongId)
    {
        const string cypher = @"
            MATCH (p:Person {strong_id: $strongId})
            DETACH DELETE p
            RETURN count(p) AS deleted";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new { strongId });
        var record = await result.SingleAsync();
        return record["deleted"].As<long>() > 0;
    }

    // ──────────────────────────────────────────
    // MAPPING
    // ──────────────────────────────────────────

    private static Person MapNode(INode node) => new()
    {
        StrongId    = node["strong_id"].As<string>(),
        FirstName   = node["first_name"].As<string>(),
        LastName    = node["last_name"].As<string>(),
        Email       = node.Properties.ContainsKey("email")       ? node["email"].As<string?>()       : null,
        Phone       = node.Properties.ContainsKey("phone")       ? node["phone"].As<string?>()       : null,
        Nationality = node.Properties.ContainsKey("nationality") ? node["nationality"].As<string?>() : null,
        Status      = node.Properties.ContainsKey("status")      ? node["status"].As<string?>()      : null,
    };
}

using MultiTenantKnowledgeGraph.Models;

namespace MultiTenantKnowledgeGraph.Repositories;

/// <summary>
/// Thin wrapper around GenericEntityRepository for Person entities.
/// Defines the Neo4j label and ID field, everything else is inherited.
/// </summary>
public class PersonRepository : GenericEntityRepository<Person>
{
    protected override string NodeLabel => "Person";
    protected override string IdProperty => "StrongId";
    protected override Func<Person, string> GetIdValue => p => p.StrongId;

    public PersonRepository(Neo4jService neo4j) : base(neo4j) { }
}

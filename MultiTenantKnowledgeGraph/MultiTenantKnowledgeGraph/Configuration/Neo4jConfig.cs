namespace MultiTenantKnowledgeGraph.Configuration;

/// <summary>
/// Holds connection settings for the Neo4j instance.
/// Update these values to match your local Neo4j installation.
/// </summary>
public class Neo4jConfig
{
    public string Uri { get; set; } = "neo4j://127.0.0.1:7687";
    public string Username { get; set; } = "neo4j";
    public string Password { get; set; } = "password"; 
}

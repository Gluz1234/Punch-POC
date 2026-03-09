namespace MultiTenantKnowledgeGraph.Models;

/// <summary>
/// Represents a Skill in the ontology. Skills are shared, tenant-neutral nodes.
/// A Skill like "Java" or "Project Management" exists once in the graph,
/// and multiple tenants can link persons to it via HAS_SKILL relationships.
/// </summary>
public class Skill
{
    // ----- Required Properties -----

    public string EntityId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    // ----- Optional Properties -----

    public string? Category { get; set; }
    public string? Description { get; set; }

    /// <summary>
    /// Describes the proficiency scale used for this skill (e.g. "Beginner/Intermediate/Expert").
    /// </summary>
    public string? LevelScale { get; set; }

    public override string ToString() =>
        $"Skill [{EntityId}]: {Name}";
}

namespace MultiTenantKnowledgeGraph.Models;

/// <summary>
/// Represents a Person node in the graph.
/// 
/// IDENTITY RULE: Person nodes are tenant-neutral and shared across all tenants.
/// They are identified globally by strong_id and NEVER duplicated.
/// Tenant context is carried on RELATIONSHIPS, not on the Person node itself.
///
/// This models the real-world fact that a human being exists independently
/// of which organization or tenant has a relationship with them.
/// </summary>
public class Person
{
    // ----- Required Properties -----

    /// <summary>
    /// Global unique identifier. Used as the MERGE key — guarantees no duplicate nodes.
    /// Could be a national ID, passport number, SSN, or any stable external identifier.
    /// </summary>
    public string StrongId { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;

    // ----- Optional Properties -----

    public DateTime? BirthDate { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Nationality { get; set; }

    /// <summary>
    /// Represents the person's current status (e.g. Active, Inactive, Deceased).
    /// Not tenant-scoped — reflects a real-world state of the person.
    /// </summary>
    public string? Status { get; set; }

    public override string ToString() =>
        $"Person [{StrongId}]: {FirstName} {LastName}";
}

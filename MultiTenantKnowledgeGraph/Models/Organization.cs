namespace MultiTenantKnowledgeGraph.Models;

/// <summary>
/// Represents an Organization node — Universities, Companies, Municipalities, etc.
/// Organizations are shared entities and may appear across multiple tenant contexts.
/// </summary>
public class Organization
{
    // ----- Required Properties -----

    public string EntityId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Discriminator for the type of organization.
    /// Allowed values: University | Company | Municipality
    /// </summary>
    public string OrganizationType { get; set; } = string.Empty;

    // ----- Optional Properties -----

    public string? Industry { get; set; }
    public string? RegistrationNumber { get; set; }
    public string? Website { get; set; }
    public string? Phone { get; set; }

    public override string ToString() =>
        $"Organization [{EntityId}]: {Name} ({OrganizationType})";
}

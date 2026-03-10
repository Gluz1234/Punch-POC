namespace MultiTenantKnowledgeGraph.Models;

/// <summary>
/// Represents a geographic Location — Cities, Regions, or Countries.
/// Locations are tenant-neutral shared nodes in the ontology.
/// </summary>
public class Location
{
    // ----- Required Properties -----

    public string EntityId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Allowed values: City | Region | Country
    /// </summary>
    public string LocationType { get; set; } = string.Empty;

    // ----- Optional Properties -----

    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? PostalCode { get; set; }
    public long? Population { get; set; }

    /// <summary>Emoji icon representing this entity type.</summary>
    public string Icon { get; set; } = "📍";

    public override string ToString() =>
        $"Location [{EntityId}]: {Name} ({LocationType})";
}

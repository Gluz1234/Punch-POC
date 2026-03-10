namespace MultiTenantKnowledgeGraph.Models;

/// <summary>
/// Represents an Education record — a Degree, Certificate, or Course.
/// Education nodes are linked to the Person who completed them (COMPLETED)
/// and to the Organization that provided them (PROVIDED_BY).
/// </summary>
public class Education
{
    // ----- Required Properties -----

    public string EntityId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Allowed values: Degree | Certificate | Course
    /// </summary>
    public string EducationType { get; set; } = string.Empty;

    // ----- Optional Properties -----

    public string? FieldOfStudy { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Grade { get; set; }

    /// <summary>Emoji icon representing this entity type.</summary>
    public string Icon { get; set; } = "🎓";

    public override string ToString() =>
        $"Education [{EntityId}]: {Title} ({EducationType})";
}

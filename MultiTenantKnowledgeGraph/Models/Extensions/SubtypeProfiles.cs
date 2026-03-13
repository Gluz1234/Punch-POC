namespace MultiTenantKnowledgeGraph.Models.Extensions;

/// <summary>
/// Extra fields for the Student subtype, stored on a tenant-scoped SubtypeInstance node.
///
/// TENANT-SCOPED SUBTYPE PATTERN:
///   When tenant_mit enrolls a person, we:
///     1. MERGE the Person node (already exists)
///     2. CREATE (p)-[:HAS_SUBTYPE_INSTANCE {tenant_id}]-&gt;(si:SubtypeInstance:Student {...})
///
/// Only the owning tenant can see/edit this SubtypeInstance node.
/// A person can have multiple SubtypeInstance nodes from different tenants.
/// </summary>
public class StudentProfile
{
    public string EntityId { get; set; } = string.Empty;     // links to Person
    public string TenantId { get; set; } = string.Empty;     // owning tenant for this subtype instance

    // Student-specific fields (stored on a SubtypeInstance node)
    public string? StudentId { get; set; }                   // institutional ID
    public double? Gpa { get; set; }
    public int?    EnrollmentYear { get; set; }
    public string? EnrollmentStatus { get; set; }            // Active / Graduated / On Leave
    public string? StudyMode { get; set; }                   // Full-time / Part-time

    /// <summary>Emoji icon for the Student subtype. Type-level constant — not stored in Neo4j.</summary>
    public string Icon { get; set; } = "📝";
}

/// <summary>
/// Extra fields added to a Person node when promoted to :Employee.
/// Triggered when a tenant creates a WORKS_AT relationship.
/// </summary>
public class EmployeeProfile
{
    public string EntityId { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;

    public string? EmployeeNumber { get; set; }
    public string? ContractType { get; set; }                // Permanent / Contract / Freelance
    public string? SalaryBand { get; set; }                  // e.g. L3, L4, Senior
    public string? Department { get; set; }
    public DateTime? HireDate { get; set; }

    /// <summary>Emoji icon for the Employee subtype. Type-level constant — not stored in Neo4j.</summary>
    public string Icon { get; set; } = "💼";
}

/// <summary>
/// Extra fields added to a Person node when promoted to :Resident.
/// Triggered when a municipality tenant registers a person.
/// </summary>
public class ResidentProfile
{
    public string EntityId { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;

    public string? ResidentId { get; set; }                  // municipal registration number
    public DateTime? RegistrationDate { get; set; }
    public string? ResidencyType { get; set; }               // Citizen / Expat / Temporary
    public string? MaritalStatus { get; set; }

    /// <summary>Emoji icon for the Resident subtype. Type-level constant — not stored in Neo4j.</summary>
    public string Icon { get; set; } = "🏠";
}

/// <summary>
/// Extra fields added to a Person node when promoted to :Researcher.
/// Can stack on top of Student (PhD candidate) or Employee (research staff).
/// </summary>
public class ResearcherProfile
{
    public string EntityId { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;

    public string? OrcidId { get; set; }                     // global researcher identifier
    public string? ResearchField { get; set; }
    public int?    HIndex { get; set; }
    public string? ResearcherType { get; set; }              // PhD / PostDoc / Faculty

    /// <summary>Emoji icon for the Researcher subtype. Type-level constant — not stored in Neo4j.</summary>
    public string Icon { get; set; } = "🔬";
}

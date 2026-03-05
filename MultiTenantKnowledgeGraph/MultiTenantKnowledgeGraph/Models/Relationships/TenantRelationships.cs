namespace MultiTenantKnowledgeGraph.Models.Relationships;

/// <summary>
/// Base class for all tenant-owned relationships.
///
/// TENANCY RULE:
/// Tenant isolation is achieved by storing tenant_id on RELATIONSHIPS, not on nodes.
/// This allows the same Person/Organization/Skill node to participate in relationships
/// across multiple tenants without duplicating the node.
///
/// Example: Person [strong_id=123]
///   -[ENROLLED_IN, tenant_id=university_A]-> Organization [MIT]
///   -[WORKS_AT,    tenant_id=employer_B]  -> Organization [Acme Corp]
///
/// The same Person node appears in both tenant contexts.
/// </summary>
public abstract class TenantRelationshipBase
{
    /// <summary>
    /// The tenant that owns this relationship.
    /// All tenant-scoped queries filter on this property.
    /// </summary>
    public string TenantId { get; set; } = string.Empty;

    /// <summary>
    /// UTC timestamp of when the relationship was created.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Represents a Person enrolled in an Organization (typically a University).
/// Carries tenant context so enrollment can be scoped per tenant.
/// </summary>
public class EnrolledInRelationship : TenantRelationshipBase
{
    public string PersonStrongId { get; set; } = string.Empty;
    public string OrgId { get; set; } = string.Empty;

    /// <summary>Optional: enrollment start date.</summary>
    public DateTime? StartDate { get; set; }

    /// <summary>Optional: program or degree being pursued.</summary>
    public string? Program { get; set; }
}

/// <summary>
/// Represents a Person working at an Organization (typically a Company).
/// </summary>
public class WorksAtRelationship : TenantRelationshipBase
{
    public string PersonStrongId { get; set; } = string.Empty;
    public string OrgId { get; set; } = string.Empty;
    public string? JobTitle { get; set; }
    public DateTime? StartDate { get; set; }
}

/// <summary>
/// Represents a Person living in a Location.
/// </summary>
public class LivesInRelationship : TenantRelationshipBase
{
    public string PersonStrongId { get; set; } = string.Empty;
    public string LocationId { get; set; } = string.Empty;
    public string? ResidenceType { get; set; } // e.g. Primary, Secondary
}

/// <summary>
/// Represents a Person having a Skill.
/// </summary>
public class HasSkillRelationship : TenantRelationshipBase
{
    public string PersonStrongId { get; set; } = string.Empty;
    public string SkillId { get; set; } = string.Empty;
    public string? ProficiencyLevel { get; set; }
}

/// <summary>
/// Represents a Person having completed an Education record.
/// </summary>
public class CompletedRelationship : TenantRelationshipBase
{
    public string PersonStrongId { get; set; } = string.Empty;
    public string EducationId { get; set; } = string.Empty;
}

/// <summary>
/// Represents an Education being provided by an Organization.
/// This is a structural (non-tenant) relationship between two entity nodes.
/// </summary>
public class ProvidedByRelationship
{
    public string EducationId { get; set; } = string.Empty;
    public string OrgId { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Represents an Organization requiring a Skill (e.g. job requirement).
/// </summary>
public class RequiresSkillRelationship : TenantRelationshipBase
{
    public string OrgId { get; set; } = string.Empty;
    public string SkillId { get; set; } = string.Empty;
    public string? RequirementLevel { get; set; }
}

namespace MultiTenantKnowledgeGraph.Models.Relationships;

// ══════════════════════════════════════════════════════════════════════
// STUDENT RELATIONSHIPS
// These only exist when a Person has the :Student label.
// All carry tenant_id so they are scoped to the university tenant.
// ══════════════════════════════════════════════════════════════════════

/// <summary>
/// A student is advised by a Person (typically a professor/faculty member).
/// Person:Student -[HAS_ADVISOR]-> Person
/// </summary>
public class HasAdvisorRelationship : TenantRelationshipBase
{
    public string StudentStrongId  { get; set; } = string.Empty;
    public string AdvisorStrongId  { get; set; } = string.Empty;
    public string? AdvisorRole     { get; set; }   // e.g. Primary / Secondary / Thesis
}

/// <summary>
/// A student registers for a Course.
/// Person:Student -[REGISTERED_FOR]-> Course
/// </summary>
public class RegisteredForRelationship : TenantRelationshipBase
{
    public string StudentStrongId { get; set; } = string.Empty;
    public string CourseId        { get; set; } = string.Empty;
    public string? Grade          { get; set; }
    public string? Status         { get; set; }   // Enrolled / Completed / Dropped
    public string? AcademicTerm   { get; set; }
}

/// <summary>
/// Links a Course to the Organization that offers it.
/// Course -[OFFERED_BY]-> Organization
/// </summary>
public class OfferedByRelationship
{
    public string CourseId   { get; set; } = string.Empty;
    public string OrgId      { get; set; } = string.Empty;
    public string TenantId   { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// ══════════════════════════════════════════════════════════════════════
// EMPLOYEE RELATIONSHIPS
// These only exist when a Person has the :Employee label.
// ══════════════════════════════════════════════════════════════════════

/// <summary>
/// An employee reports to another employee.
/// Person:Employee -[REPORTS_TO]-> Person:Employee
/// </summary>
public class ReportsToRelationship : TenantRelationshipBase
{
    public string EmployeeStrongId { get; set; } = string.Empty;
    public string ManagerStrongId  { get; set; } = string.Empty;
    public string? ReportingType   { get; set; }   // Direct / Dotted-line
}

/// <summary>
/// An employee works in a specific Department.
/// Person:Employee -[WORKS_IN]-> Department
/// </summary>
public class WorksInRelationship : TenantRelationshipBase
{
    public string EmployeeStrongId { get; set; } = string.Empty;
    public string DepartmentId     { get; set; } = string.Empty;
    public string? Role            { get; set; }
    public DateTime? StartDate     { get; set; }
}

/// <summary>
/// Links a Department to the Organization it belongs to.
/// Department -[BELONGS_TO]-> Organization
/// </summary>
public class BelongsToRelationship
{
    public string DepartmentId { get; set; } = string.Empty;
    public string OrgId        { get; set; } = string.Empty;
    public string TenantId     { get; set; } = string.Empty;
    public DateTime CreatedAt  { get; set; } = DateTime.UtcNow;
}

// ══════════════════════════════════════════════════════════════════════
// RESIDENT RELATIONSHIPS
// These only exist when a Person has the :Resident label.
// ══════════════════════════════════════════════════════════════════════

/// <summary>
/// A resident is registered at a Location (their official address).
/// Person:Resident -[REGISTERED_AT]-> Location
/// Distinct from LIVES_IN which is informal residency.
/// </summary>
public class RegisteredAtRelationship : TenantRelationshipBase
{
    public string ResidentStrongId { get; set; } = string.Empty;
    public string LocationId       { get; set; } = string.Empty;
    public DateTime? Since         { get; set; }
    public string? AddressType     { get; set; }   // Primary / Postal / Business
}

// ══════════════════════════════════════════════════════════════════════
// RESEARCHER RELATIONSHIPS
// These stack on top of Student (PhD) or Employee (research staff).
// ══════════════════════════════════════════════════════════════════════

/// <summary>
/// A researcher is affiliated with a research group or faculty.
/// Person:Researcher -[AFFILIATED_WITH]-> Organization
/// </summary>
public class AffiliatedWithRelationship : TenantRelationshipBase
{
    public string ResearcherStrongId { get; set; } = string.Empty;
    public string OrgId              { get; set; } = string.Empty;
    public string? AffiliationType   { get; set; }   // Faculty / Visiting / Industry
}

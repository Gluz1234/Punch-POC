namespace MultiTenantKnowledgeGraph.Models;

/// <summary>
/// Represents an academic Course offered by a University.
/// Courses are tenant-neutral shared nodes — e.g. "CS101 at MIT" exists once.
/// Students register for courses via REGISTERED_FOR {tenant_id}.
/// </summary>
public class Course
{
    // ----- Required -----
    public string EntityId   { get; set; } = string.Empty;
    public string Name       { get; set; } = string.Empty;
    public string OrgId      { get; set; } = string.Empty;  // owning university

    // ----- Optional -----
    public string? Code          { get; set; }              // e.g. "6.006"
    public string? Description   { get; set; }
    public int?    Credits       { get; set; }
    public string? Level         { get; set; }              // Undergraduate / Graduate / PhD
    public string? AcademicTerm  { get; set; }              // e.g. "Fall 2023"

    public override string ToString() => $"Course [{EntityId}]: {Name} ({Code})";
}

/// <summary>
/// Represents a Department within an Organization.
/// Employees are assigned to departments via WORKS_IN {tenant_id}.
/// </summary>
public class Department
{
    // ----- Required -----
    public string EntityId     { get; set; } = string.Empty;
    public string Name         { get; set; } = string.Empty;
    public string OrgId        { get; set; } = string.Empty;  // parent organization

    // ----- Optional -----
    public string? Code        { get; set; }
    public string? Description { get; set; }
    public string? HeadName    { get; set; }                   // dept head (denormalized for display)

    public override string ToString() => $"Department [{EntityId}]: {Name}";
}

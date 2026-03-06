using MultiTenantKnowledgeGraph.Models;
using MultiTenantKnowledgeGraph.Models.Extensions;
using MultiTenantKnowledgeGraph.Models.Relationships;
using MultiTenantKnowledgeGraph.Repositories;

namespace MultiTenantKnowledgeGraph.Services;

/// <summary>
/// Orchestrates the PROMOTION workflow.
///
/// Promotion = adding a subtype label + extra fields to an existing Person node.
/// The base Person node is never replaced or duplicated.
///
/// Typical call sequence (e.g. university enrolls a student):
///   1. PersonService.CreateOrUpdateAsync(person)   ← ensures Person node exists
///   2. RelationshipService.AddEnrolledInAsync(rel)  ← creates ENROLLED_IN with tenant_id
///   3. PromotionService.PromoteToStudentAsync(...)  ← adds :Student label + GPA etc.
///   4. PromotionService.AssignAdvisorAsync(...)     ← creates HAS_ADVISOR relationship
///   5. PromotionService.RegisterForCourseAsync(...) ← creates REGISTERED_FOR relationship
///
/// Step 3-5 are the "extension" — steps 1-2 were already in the original system.
/// </summary>
public class PromotionService
{
    private readonly PromotionRepository _repo;

    public PromotionService(PromotionRepository repo) => _repo = repo;

    // ── Label Promotions ───────────────────────────────────────────────

    public Task PromoteToStudentAsync(StudentProfile profile)
    {
        if (string.IsNullOrWhiteSpace(profile.StrongId))
            throw new ArgumentException("StrongId required for promotion.");
        return _repo.PromoteToStudentAsync(profile);
    }

    public Task PromoteToEmployeeAsync(EmployeeProfile profile)
    {
        if (string.IsNullOrWhiteSpace(profile.StrongId))
            throw new ArgumentException("StrongId required for promotion.");
        return _repo.PromoteToEmployeeAsync(profile);
    }

    public Task PromoteToResidentAsync(ResidentProfile profile)
    {
        if (string.IsNullOrWhiteSpace(profile.StrongId))
            throw new ArgumentException("StrongId required for promotion.");
        return _repo.PromoteToResidentAsync(profile);
    }

    public Task PromoteToResearcherAsync(ResearcherProfile profile)
    {
        if (string.IsNullOrWhiteSpace(profile.StrongId))
            throw new ArgumentException("StrongId required for promotion.");
        return _repo.PromoteToResearcherAsync(profile);
    }

    public Task PromoteToSubtypeAsync(string strongId, string subtype, Dictionary<string, object> properties)
    {
        if (string.IsNullOrWhiteSpace(strongId))
            throw new ArgumentException("StrongId required for promotion.");
        if (string.IsNullOrWhiteSpace(subtype))
            throw new ArgumentException("Subtype required.");
        return _repo.PromoteToSubtypeAsync(strongId, subtype, properties);
    }

    /// <summary>Returns the current labels on a person — e.g. ["Person","Student","Researcher"]</summary>
    public Task<List<string>> GetPersonLabelsAsync(string strongId) =>
        _repo.GetLabelsAsync(strongId);

    // ── Student Relationships ──────────────────────────────────────────

    public Task AssignAdvisorAsync(HasAdvisorRelationship rel) =>
        _repo.CreateHasAdvisorAsync(rel);

    public Task RegisterForCourseAsync(RegisteredForRelationship rel) =>
        _repo.CreateRegisteredForAsync(rel);

    // ── Employee Relationships ─────────────────────────────────────────

    public Task AssignReportsToAsync(ReportsToRelationship rel) =>
        _repo.CreateReportsToAsync(rel);

    public Task AssignToDepartmentAsync(WorksInRelationship rel) =>
        _repo.CreateWorksInDepartmentAsync(rel);

    // ── Resident Relationships ─────────────────────────────────────────

    public Task RegisterAtLocationAsync(RegisteredAtRelationship rel) =>
        _repo.CreateRegisteredAtAsync(rel);

    // ── Researcher Relationships ───────────────────────────────────────

    public Task AffiliateWithOrgAsync(AffiliatedWithRelationship rel) =>
        _repo.CreateAffiliatedWithAsync(rel);

    // ── Course & Department ────────────────────────────────────────────

    public Task<Course> CreateOrUpdateCourseAsync(Course course)
    {
        if (string.IsNullOrWhiteSpace(course.CourseId))
            throw new ArgumentException("CourseId required.");
        return _repo.UpsertCourseAsync(course);
    }

    public Task LinkCourseToOrgAsync(OfferedByRelationship rel) =>
        _repo.CreateOfferedByAsync(rel);

    public Task<Department> CreateOrUpdateDepartmentAsync(Department dept)
    {
        if (string.IsNullOrWhiteSpace(dept.DepartmentId))
            throw new ArgumentException("DepartmentId required.");
        return _repo.UpsertDepartmentAsync(dept);
    }

    public Task LinkDepartmentToOrgAsync(BelongsToRelationship rel) =>
        _repo.CreateBelongsToAsync(rel);

    // ── Subtype Queries ────────────────────────────────────────────────

    public Task<List<(string StrongId, string FirstName, string LastName,
                       double? Gpa, string? Status, List<string> Labels)>>
        GetStudentsForTenantAsync(string tenantId) =>
        _repo.GetAllStudentsAsync(tenantId);

    public Task<List<(string StrongId, string FirstName, string LastName,
                       string? ContractType, string? SalaryBand, List<string> Labels)>>
        GetEmployeesForTenantAsync(string tenantId) =>
        _repo.GetAllEmployeesAsync(tenantId);

    public Task<List<(string StrongId, string FirstName, string LastName,
                       string? OrcidId, string? Field, string? Type, List<string> Labels)>>
        GetAllResearchersAsync() =>
        _repo.GetAllResearchersAsync();
}

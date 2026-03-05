using MultiTenantKnowledgeGraph.Models;
using MultiTenantKnowledgeGraph.Models.Relationships;
using MultiTenantKnowledgeGraph.Repositories;

namespace MultiTenantKnowledgeGraph.Services;

// ══════════════════════════════════════════════════════════════════════════════
// PERSON SERVICE
// ══════════════════════════════════════════════════════════════════════════════

/// <summary>
/// Business logic layer for Person management.
/// Enforces the IDENTITY RULE: always upsert by strong_id, never duplicate.
/// </summary>
public class PersonService
{
    private readonly PersonRepository _repo;
    public PersonService(PersonRepository repo) => _repo = repo;

    public Task<Person> CreateOrUpdateAsync(Person person)
    {
        if (string.IsNullOrWhiteSpace(person.StrongId))
            throw new ArgumentException("Person.StrongId is required and must be unique.");
        if (string.IsNullOrWhiteSpace(person.FirstName) || string.IsNullOrWhiteSpace(person.LastName))
            throw new ArgumentException("Person first and last name are required.");

        // MERGE on strong_id — identity rule enforced here
        return _repo.UpsertAsync(person);
    }

    public Task<Person?> GetByIdAsync(string strongId) => _repo.GetByIdAsync(strongId);

    public Task<List<Person>> GetAllAsync() => _repo.GetAllAsync();

    public async Task<bool> DeleteAsync(string strongId)
    {
        // Warn: deletes person from ALL tenant contexts
        return await _repo.DeleteAsync(strongId);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// ORGANIZATION SERVICE
// ══════════════════════════════════════════════════════════════════════════════

public class OrganizationService
{
    private readonly OrganizationRepository _repo;
    public OrganizationService(OrganizationRepository repo) => _repo = repo;

    public Task<Organization> CreateOrUpdateAsync(Organization org)
    {
        if (string.IsNullOrWhiteSpace(org.OrgId))
            throw new ArgumentException("Organization.OrgId is required.");

        var validTypes = new[] { "University", "Company", "Municipality" };
        if (!validTypes.Contains(org.OrganizationType))
            throw new ArgumentException($"OrganizationType must be one of: {string.Join(", ", validTypes)}");

        return _repo.UpsertAsync(org);
    }

    public Task<Organization?> GetByIdAsync(string orgId) => _repo.GetByIdAsync(orgId);
    public Task<List<Organization>> GetAllAsync() => _repo.GetAllAsync();
    public Task<bool> DeleteAsync(string orgId) => _repo.DeleteAsync(orgId);
}

// ══════════════════════════════════════════════════════════════════════════════
// LOCATION SERVICE
// ══════════════════════════════════════════════════════════════════════════════

public class LocationService
{
    private readonly LocationRepository _repo;
    public LocationService(LocationRepository repo) => _repo = repo;

    public Task<Location> CreateOrUpdateAsync(Location location)
    {
        if (string.IsNullOrWhiteSpace(location.LocationId))
            throw new ArgumentException("Location.LocationId is required.");

        var validTypes = new[] { "City", "Region", "Country" };
        if (!validTypes.Contains(location.LocationType))
            throw new ArgumentException($"LocationType must be one of: {string.Join(", ", validTypes)}");

        return _repo.UpsertAsync(location);
    }

    public Task<Location?> GetByIdAsync(string locationId) => _repo.GetByIdAsync(locationId);
    public Task<List<Location>> GetAllAsync() => _repo.GetAllAsync();
    public Task<bool> DeleteAsync(string locationId) => _repo.DeleteAsync(locationId);
}

// ══════════════════════════════════════════════════════════════════════════════
// SKILL SERVICE
// ══════════════════════════════════════════════════════════════════════════════

public class SkillService
{
    private readonly SkillRepository _repo;
    public SkillService(SkillRepository repo) => _repo = repo;

    public Task<Skill> CreateOrUpdateAsync(Skill skill)
    {
        if (string.IsNullOrWhiteSpace(skill.SkillId))
            throw new ArgumentException("Skill.SkillId is required.");
        return _repo.UpsertAsync(skill);
    }

    public Task<Skill?> GetByIdAsync(string skillId) => _repo.GetByIdAsync(skillId);
    public Task<List<Skill>> GetAllAsync() => _repo.GetAllAsync();
    public Task<bool> DeleteAsync(string skillId) => _repo.DeleteAsync(skillId);
}

// ══════════════════════════════════════════════════════════════════════════════
// EDUCATION SERVICE
// ══════════════════════════════════════════════════════════════════════════════

public class EducationService
{
    private readonly EducationRepository _repo;
    public EducationService(EducationRepository repo) => _repo = repo;

    public Task<Education> CreateOrUpdateAsync(Education edu)
    {
        if (string.IsNullOrWhiteSpace(edu.EducationId))
            throw new ArgumentException("Education.EducationId is required.");

        var validTypes = new[] { "Degree", "Certificate", "Course" };
        if (!validTypes.Contains(edu.EducationType))
            throw new ArgumentException($"EducationType must be one of: {string.Join(", ", validTypes)}");

        return _repo.UpsertAsync(edu);
    }

    public Task<Education?> GetByIdAsync(string educationId) => _repo.GetByIdAsync(educationId);
    public Task<List<Education>> GetAllAsync() => _repo.GetAllAsync();
    public Task<bool> DeleteAsync(string educationId) => _repo.DeleteAsync(educationId);
}

// ══════════════════════════════════════════════════════════════════════════════
// RELATIONSHIP SERVICE
// ══════════════════════════════════════════════════════════════════════════════

/// <summary>
/// Wraps the RelationshipRepository with light validation.
/// </summary>
public class RelationshipService
{
    private readonly RelationshipRepository _repo;
    public RelationshipService(RelationshipRepository repo) => _repo = repo;

    public Task AddEnrolledInAsync(EnrolledInRelationship rel)
    {
        ValidateTenantRel(rel.PersonStrongId, rel.OrgId, rel.TenantId);
        return _repo.CreateEnrolledInAsync(rel);
    }

    public Task RemoveEnrolledInAsync(string personId, string orgId, string tenantId) =>
        _repo.DeleteEnrolledInAsync(personId, orgId, tenantId);

    public Task AddWorksAtAsync(WorksAtRelationship rel)
    {
        ValidateTenantRel(rel.PersonStrongId, rel.OrgId, rel.TenantId);
        return _repo.CreateWorksAtAsync(rel);
    }

    public Task RemoveWorksAtAsync(string personId, string orgId, string tenantId) =>
        _repo.DeleteWorksAtAsync(personId, orgId, tenantId);

    public Task AddLivesInAsync(LivesInRelationship rel)
    {
        ValidateTenantRel(rel.PersonStrongId, rel.LocationId, rel.TenantId);
        return _repo.CreateLivesInAsync(rel);
    }

    public Task RemoveLivesInAsync(string personId, string locationId, string tenantId) =>
        _repo.DeleteLivesInAsync(personId, locationId, tenantId);

    public Task AddHasSkillAsync(HasSkillRelationship rel)
    {
        ValidateTenantRel(rel.PersonStrongId, rel.SkillId, rel.TenantId);
        return _repo.CreateHasSkillAsync(rel);
    }

    public Task RemoveHasSkillAsync(string personId, string skillId, string tenantId) =>
        _repo.DeleteHasSkillAsync(personId, skillId, tenantId);

    public Task AddCompletedAsync(CompletedRelationship rel)
    {
        ValidateTenantRel(rel.PersonStrongId, rel.EducationId, rel.TenantId);
        return _repo.CreateCompletedAsync(rel);
    }

    public Task RemoveCompletedAsync(string personId, string educationId, string tenantId) =>
        _repo.DeleteCompletedAsync(personId, educationId, tenantId);

    public Task AddProvidedByAsync(ProvidedByRelationship rel) =>
        _repo.CreateProvidedByAsync(rel);

    public Task AddRequiresSkillAsync(RequiresSkillRelationship rel) =>
        _repo.CreateRequiresSkillAsync(rel);

    public Task<List<string>> GetPersonRelationshipsAsync(string strongId, string? tenantId = null) =>
        _repo.ListPersonRelationshipsAsync(strongId, tenantId);

    private static void ValidateTenantRel(string personId, string targetId, string tenantId)
    {
        if (string.IsNullOrWhiteSpace(personId)) throw new ArgumentException("PersonStrongId required.");
        if (string.IsNullOrWhiteSpace(targetId)) throw new ArgumentException("Target entity ID required.");
        if (string.IsNullOrWhiteSpace(tenantId)) throw new ArgumentException("TenantId required on relationships.");
    }
}

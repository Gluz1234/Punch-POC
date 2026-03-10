using Neo4j.Driver;
using MultiTenantKnowledgeGraph.Models;
using MultiTenantKnowledgeGraph.Models.Extensions;
using MultiTenantKnowledgeGraph.Models.Relationships;

namespace MultiTenantKnowledgeGraph.Repositories;

/// <summary>
/// Handles the PROMOTION pattern:
///   - Adding subtype labels to existing Person nodes (SET p:Student etc.)
///   - Setting subtype-specific fields on those nodes
///   - Creating subtype-specific relationships
///   - CRUD for new node types: Course, Department
///
/// PROMOTION is additive:
///   - Never removes the :Person label
///   - Never removes existing properties
///   - A node can be promoted to multiple subtypes simultaneously
///
/// Example: Sarah Chen starts as Person, gets promoted to Person:Student by MIT,
///          then to Person:Student:Employee when Google hires her.
/// </summary>
public class PromotionRepository
{
    private readonly Neo4jService _neo4j;
    public PromotionRepository(Neo4jService neo4j) => _neo4j = neo4j;

    // ══════════════════════════════════════════════════════════════
    // SUBTYPE PROMOTION — Label + Fields
    // ══════════════════════════════════════════════════════════════

    /// <summary>
    /// Promotes a Person to :Student and sets student-specific fields.
    /// Safe to call multiple times — ON MATCH SET is idempotent.
    /// </summary>
    public async Task PromoteToStudentAsync(StudentProfile profile)
    {
        const string cypher = @"
            MATCH (p:Person {entity_id: $strongId})
            SET p:Student
            SET p.student_id       = $studentId,
                p.gpa              = $gpa,
                p.enrollment_year  = $enrollmentYear,
                p.enrollment_status= $enrollmentStatus,
                p.study_mode       = $studyMode
            RETURN p";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            strongId         = profile.EntityId,
            studentId        = profile.StudentId,
            gpa              = profile.Gpa,
            enrollmentYear   = profile.EnrollmentYear,
            enrollmentStatus = profile.EnrollmentStatus,
            studyMode        = profile.StudyMode,
        });
        await result.ConsumeAsync();
    }

    /// <summary>
    /// Promotes a Person to :Employee and sets employee-specific fields.
    /// </summary>
    public async Task PromoteToEmployeeAsync(EmployeeProfile profile)
    {
        const string cypher = @"
            MATCH (p:Person {entity_id: $strongId})
            SET p:Employee
            SET p.employee_number = $employeeNumber,
                p.contract_type   = $contractType,
                p.salary_band     = $salaryBand,
                p.department      = $department,
                p.hire_date       = $hireDate
            RETURN p";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            strongId       = profile.EntityId,
            employeeNumber = profile.EmployeeNumber,
            contractType   = profile.ContractType,
            salaryBand     = profile.SalaryBand,
            department     = profile.Department,
            hireDate       = profile.HireDate?.ToString("o"),
        });
        await result.ConsumeAsync();
    }

    /// <summary>
    /// Promotes a Person to :Resident and sets resident-specific fields.
    /// </summary>
    public async Task PromoteToResidentAsync(ResidentProfile profile)
    {
        const string cypher = @"
            MATCH (p:Person {entity_id: $strongId})
            SET p:Resident
            SET p.resident_id        = $residentId,
                p.registration_date  = $registrationDate,
                p.residency_type     = $residencyType,
                p.marital_status     = $maritalStatus
            RETURN p";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            strongId         = profile.EntityId,
            residentId       = profile.ResidentId,
            registrationDate = profile.RegistrationDate?.ToString("o"),
            residencyType    = profile.ResidencyType,
            maritalStatus    = profile.MaritalStatus,
        });
        await result.ConsumeAsync();
    }

    /// <summary>
    /// Promotes a Person to :Researcher and sets researcher-specific fields.
    /// Can stack on top of :Student (PhD) or :Employee (research staff).
    /// </summary>
    public async Task PromoteToResearcherAsync(ResearcherProfile profile)
    {
        const string cypher = @"
            MATCH (p:Person {entity_id: $strongId})
            SET p:Researcher
            SET p.orcid_id          = $orcidId,
                p.research_field    = $researchField,
                p.h_index           = $hIndex,
                p.researcher_type   = $researcherType
            RETURN p";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            strongId       = profile.EntityId,
            orcidId        = profile.OrcidId,
            researchField  = profile.ResearchField,
            hIndex         = profile.HIndex,
            researcherType = profile.ResearcherType,
        });
        await result.ConsumeAsync();
    }

    /// <summary>
    /// Generic promotion to any subtype with dynamic properties.
    /// </summary>
    public async Task PromoteToSubtypeAsync(string strongId, string subtype, Dictionary<string, object> properties)
    {
        // Build SET clauses dynamically
        var setParts = properties.Select(kvp => $"p.`{kvp.Key}` = $prop_{kvp.Key}").ToList();
        var setClause = setParts.Any() ? $"SET {string.Join(", ", setParts)}" : "";
        
        var cypher = $@"
            MATCH (p:Person {{entity_id: $strongId}})
            SET p:`{subtype}`
            {setClause}
            RETURN p";

        var parameters = new Dictionary<string, object> { ["strongId"] = strongId };
        foreach (var kvp in properties)
        {
            parameters[$"prop_{kvp.Key}"] = kvp.Value;
        }

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, parameters);
        await result.ConsumeAsync();
    }

    /// <summary>
    /// Returns all labels currently on a Person node.
    /// E.g. ["Person", "Student", "Employee"]
    /// </summary>
    public async Task<List<string>> GetLabelsAsync(string strongId)
    {
        const string cypher = "MATCH (p:Person {entity_id: $strongId}) RETURN labels(p) AS labels";
        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new { strongId });
        if (await result.FetchAsync())
            return result.Current["labels"].As<List<string>>();
        return new List<string>();
    }

    // ══════════════════════════════════════════════════════════════
    // STUDENT RELATIONSHIPS
    // ══════════════════════════════════════════════════════════════

    public async Task CreateHasAdvisorAsync(HasAdvisorRelationship rel)
    {
        const string cypher = @"
            MATCH (s:Student {entity_id: $studentId})
            MATCH (a:Person  {entity_id: $advisorId})
            MERGE (s)-[r:HAS_ADVISOR {tenant_id: $tenantId, advisor_id: $advisorId}]->(a)
            ON CREATE SET
                r.created_at  = $createdAt,
                r.advisor_role = $advisorRole
            RETURN r";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            studentId  = rel.StudentStrongId,
            advisorId  = rel.AdvisorStrongId,
            tenantId   = rel.TenantId,
            createdAt  = rel.CreatedAt.ToString("o"),
            advisorRole = rel.AdvisorRole
        });
        await result.ConsumeAsync();
    }

    public async Task CreateRegisteredForAsync(RegisteredForRelationship rel)
    {
        const string cypher = @"
            MATCH (s:Student {entity_id: $studentId})
            MATCH (c:Course  {entity_id: $courseId})
            MERGE (s)-[r:REGISTERED_FOR {tenant_id: $tenantId, entity_id: $courseId}]->(c)
            ON CREATE SET
                r.created_at   = $createdAt,
                r.grade        = $grade,
                r.status       = $status,
                r.academic_term = $term
            RETURN r";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            studentId = rel.StudentStrongId,
            courseId  = rel.CourseId,
            tenantId  = rel.TenantId,
            createdAt = rel.CreatedAt.ToString("o"),
            grade     = rel.Grade,
            status    = rel.Status,
            term      = rel.AcademicTerm
        });
        await result.ConsumeAsync();
    }

    // ══════════════════════════════════════════════════════════════
    // EMPLOYEE RELATIONSHIPS
    // ══════════════════════════════════════════════════════════════

    public async Task CreateReportsToAsync(ReportsToRelationship rel)
    {
        const string cypher = @"
            MATCH (e:Employee {entity_id: $employeeId})
            MATCH (m:Employee {entity_id: $managerId})
            MERGE (e)-[r:REPORTS_TO {tenant_id: $tenantId}]->(m)
            ON CREATE SET
                r.created_at    = $createdAt,
                r.reporting_type = $reportingType
            RETURN r";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            employeeId    = rel.EmployeeStrongId,
            managerId     = rel.ManagerStrongId,
            tenantId      = rel.TenantId,
            createdAt     = rel.CreatedAt.ToString("o"),
            reportingType = rel.ReportingType
        });
        await result.ConsumeAsync();
    }

    public async Task CreateWorksInDepartmentAsync(WorksInRelationship rel)
    {
        const string cypher = @"
            MATCH (e:Employee   {entity_id:    $employeeId})
            MATCH (d:Department {entity_id: $deptId})
            MERGE (e)-[r:WORKS_IN {tenant_id: $tenantId, entity_id: $deptId}]->(d)
            ON CREATE SET
                r.created_at = $createdAt,
                r.role       = $role,
                r.start_date = $startDate
            RETURN r";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            employeeId = rel.EmployeeStrongId,
            deptId     = rel.DepartmentId,
            tenantId   = rel.TenantId,
            createdAt  = rel.CreatedAt.ToString("o"),
            role       = rel.Role,
            startDate  = rel.StartDate?.ToString("o")
        });
        await result.ConsumeAsync();
    }

    // ══════════════════════════════════════════════════════════════
    // RESIDENT RELATIONSHIPS
    // ══════════════════════════════════════════════════════════════

    public async Task CreateRegisteredAtAsync(RegisteredAtRelationship rel)
    {
        const string cypher = @"
            MATCH (r:Resident {entity_id:  $residentId})
            MATCH (l:Location {entity_id: $locationId})
            MERGE (r)-[rel:REGISTERED_AT {tenant_id: $tenantId, entity_id: $locationId}]->(l)
            ON CREATE SET
                rel.created_at  = $createdAt,
                rel.since       = $since,
                rel.address_type = $addressType
            RETURN rel";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            residentId  = rel.ResidentStrongId,
            locationId  = rel.LocationId,
            tenantId    = rel.TenantId,
            createdAt   = rel.CreatedAt.ToString("o"),
            since       = rel.Since?.ToString("o"),
            addressType = rel.AddressType
        });
        await result.ConsumeAsync();
    }

    // ══════════════════════════════════════════════════════════════
    // RESEARCHER RELATIONSHIPS
    // ══════════════════════════════════════════════════════════════

    public async Task CreateAffiliatedWithAsync(AffiliatedWithRelationship rel)
    {
        const string cypher = @"
            MATCH (r:Researcher  {entity_id: $researcherId})
            MATCH (o:Organization {entity_id:   $orgId})
            MERGE (r)-[rel:AFFILIATED_WITH {tenant_id: $tenantId, entity_id: $orgId}]->(o)
            ON CREATE SET
                rel.created_at       = $createdAt,
                rel.affiliation_type = $affiliationType
            RETURN rel";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            researcherId    = rel.ResearcherStrongId,
            orgId           = rel.OrgId,
            tenantId        = rel.TenantId,
            createdAt       = rel.CreatedAt.ToString("o"),
            affiliationType = rel.AffiliationType
        });
        await result.ConsumeAsync();
    }

    // ══════════════════════════════════════════════════════════════
    // COURSE CRUD
    // ══════════════════════════════════════════════════════════════

    public async Task<Course> UpsertCourseAsync(Course course)
    {
        const string cypher = @"
            MERGE (c:Course {entity_id: $courseId})
            ON CREATE SET
                c.name          = $name,
                c.org_id        = $orgId,
                c.code          = $code,
                c.description   = $description,
                c.credits       = $credits,
                c.level         = $level,
                c.academic_term = $term
            ON MATCH SET
                c.name          = $name,
                c.code          = $code,
                c.description   = $description,
                c.credits       = $credits,
                c.level         = $level,
                c.academic_term = $term
            RETURN c";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            courseId = course.EntityId,
            name     = course.Name,
            orgId    = course.OrgId,
            code     = course.Code,
            description = course.Description,
            credits  = course.Credits,
            level    = course.Level,
            term     = course.AcademicTerm
        });
        await result.ConsumeAsync();
        return course;
    }

    public async Task CreateOfferedByAsync(OfferedByRelationship rel)
    {
        const string cypher = @"
            MATCH (c:Course       {entity_id: $courseId})
            MATCH (o:Organization {entity_id:    $orgId})
            MERGE (c)-[r:OFFERED_BY {tenant_id: $tenantId}]->(o)
            ON CREATE SET r.created_at = $createdAt
            RETURN r";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            courseId  = rel.CourseId,
            orgId     = rel.OrgId,
            tenantId  = rel.TenantId,
            createdAt = rel.CreatedAt.ToString("o")
        });
        await result.ConsumeAsync();
    }

    public async Task<List<Course>> GetCoursesByOrgAsync(string orgId)
    {
        const string cypher = "MATCH (c:Course {org_id: $orgId}) RETURN c ORDER BY c.name";
        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new { orgId });
        var list = new List<Course>();
        await foreach (var r in result) list.Add(MapCourse(r["c"].As<INode>()));
        return list;
    }

    // ══════════════════════════════════════════════════════════════
    // DEPARTMENT CRUD
    // ══════════════════════════════════════════════════════════════

    public async Task<Department> UpsertDepartmentAsync(Department dept)
    {
        const string cypher = @"
            MERGE (d:Department {entity_id: $deptId})
            ON CREATE SET
                d.name        = $name,
                d.org_id      = $orgId,
                d.code        = $code,
                d.description = $description,
                d.head_name   = $headName
            ON MATCH SET
                d.name        = $name,
                d.code        = $code,
                d.description = $description,
                d.head_name   = $headName
            RETURN d";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            deptId      = dept.EntityId,
            name        = dept.Name,
            orgId       = dept.OrgId,
            code        = dept.Code,
            description = dept.Description,
            headName    = dept.HeadName
        });
        await result.ConsumeAsync();
        return dept;
    }

    public async Task CreateBelongsToAsync(BelongsToRelationship rel)
    {
        const string cypher = @"
            MATCH (d:Department   {entity_id: $deptId})
            MATCH (o:Organization {entity_id:        $orgId})
            MERGE (d)-[r:BELONGS_TO {tenant_id: $tenantId}]->(o)
            ON CREATE SET r.created_at = $createdAt
            RETURN r";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            deptId    = rel.DepartmentId,
            orgId     = rel.OrgId,
            tenantId  = rel.TenantId,
            createdAt = rel.CreatedAt.ToString("o")
        });
        await result.ConsumeAsync();
    }

    public async Task<List<Department>> GetDepartmentsByOrgAsync(string orgId)
    {
        const string cypher = "MATCH (d:Department {org_id: $orgId}) RETURN d ORDER BY d.name";
        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new { orgId });
        var list = new List<Department>();
        await foreach (var r in result) list.Add(MapDepartment(r["d"].As<INode>()));
        return list;
    }

    // ══════════════════════════════════════════════════════════════
    // SUBTYPE QUERIES
    // ══════════════════════════════════════════════════════════════

    /// <summary>
    /// Returns all Person:Student nodes for a given tenant (enrolled anywhere).
    /// </summary>
    public async Task<List<(string StrongId, string FirstName, string LastName,
                             double? Gpa, string? Status, List<string> Labels)>>
        GetAllStudentsAsync(string tenantId)
    {
        // We find students by looking for persons who have an ENROLLED_IN
        // relationship under this tenant — and who carry the :Student label.
        const string cypher = @"
            MATCH (p:Person:Student)-[r:ENROLLED_IN {tenant_id: $tenantId}]->(o:Organization)
            RETURN DISTINCT p.entity_id AS id, p.first_name AS fn, p.last_name AS ln,
                   p.gpa AS gpa, p.enrollment_status AS status, labels(p) AS lbls
            ORDER BY ln, fn";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new { tenantId });
        var list = new List<(string, string, string, double?, string?, List<string>)>();
        await foreach (var r in result)
            list.Add((r["id"].As<string>(), r["fn"].As<string>(), r["ln"].As<string>(),
                      r["gpa"].As<double?>(), r["status"].As<string?>(),
                      r["lbls"].As<List<string>>()));
        return list;
    }

    /// <summary>
    /// Returns all Person:Employee nodes for a given tenant.
    /// </summary>
    public async Task<List<(string StrongId, string FirstName, string LastName,
                             string? ContractType, string? SalaryBand, List<string> Labels)>>
        GetAllEmployeesAsync(string tenantId)
    {
        const string cypher = @"
            MATCH (p:Person:Employee)-[r:WORKS_AT {tenant_id: $tenantId}]->(o:Organization)
            RETURN DISTINCT p.entity_id AS id, p.first_name AS fn, p.last_name AS ln,
                   p.contract_type AS ct, p.salary_band AS sb, labels(p) AS lbls
            ORDER BY ln, fn";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new { tenantId });
        var list = new List<(string, string, string, string?, string?, List<string>)>();
        await foreach (var r in result)
            list.Add((r["id"].As<string>(), r["fn"].As<string>(), r["ln"].As<string>(),
                      r["ct"].As<string?>(), r["sb"].As<string?>(),
                      r["lbls"].As<List<string>>()));
        return list;
    }

    /// <summary>
    /// Returns all Person:Researcher nodes — cross-tenant global query.
    /// </summary>
    public async Task<List<(string StrongId, string FirstName, string LastName,
                             string? OrcidId, string? Field, string? Type, List<string> Labels)>>
        GetAllResearchersAsync()
    {
        const string cypher = @"
            MATCH (p:Person:Researcher)
            RETURN p.entity_id AS id, p.first_name AS fn, p.last_name AS ln,
                   p.orcid_id AS orcid, p.research_field AS field,
                   p.researcher_type AS rtype, labels(p) AS lbls
            ORDER BY ln, fn";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher);
        var list = new List<(string, string, string, string?, string?, string?, List<string>)>();
        await foreach (var r in result)
            list.Add((r["id"].As<string>(), r["fn"].As<string>(), r["ln"].As<string>(),
                      r["orcid"].As<string?>(), r["field"].As<string?>(),
                      r["rtype"].As<string?>(), r["lbls"].As<List<string>>()));
        return list;
    }

    // ══════════════════════════════════════════════════════════════
    // MAPPERS
    // ══════════════════════════════════════════════════════════════

    private static Course MapCourse(INode n) => new()
    {
        EntityId     = n["entity_id"].As<string>(),
        Name         = n["name"].As<string>(),
        OrgId        = n["org_id"].As<string>(),
        Code         = n.Properties.ContainsKey("code")          ? n["code"].As<string?>()          : null,
        Description  = n.Properties.ContainsKey("description")   ? n["description"].As<string?>()   : null,
        Credits      = n.Properties.ContainsKey("credits")       ? n["credits"].As<int?>()           : null,
        Level        = n.Properties.ContainsKey("level")         ? n["level"].As<string?>()          : null,
        AcademicTerm = n.Properties.ContainsKey("academic_term") ? n["academic_term"].As<string?>()  : null,
    };

    private static Department MapDepartment(INode n) => new()
    {
        EntityId     = n["entity_id"].As<string>(),
        Name         = n["name"].As<string>(),
        OrgId        = n["org_id"].As<string>(),
        Code         = n.Properties.ContainsKey("code")        ? n["code"].As<string?>()        : null,
        Description  = n.Properties.ContainsKey("description") ? n["description"].As<string?>() : null,
        HeadName     = n.Properties.ContainsKey("head_name")   ? n["head_name"].As<string?>()   : null,
    };
}

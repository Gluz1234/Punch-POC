using MultiTenantKnowledgeGraph.Models;

namespace MultiTenantKnowledgeGraph.Repositories;

/// <summary>
/// Thin wrapper repositories around GenericEntityRepository.
/// Each defines the Neo4j label and ID field; all CRUD logic is inherited.
/// </summary>

/// <summary>
/// Generic repository wrapper for Person entities.
/// </summary>
public class PersonRepository : GenericEntityRepository<Person>
{
    protected override string NodeLabel => "Person";
    protected override string IdProperty => "StrongId";
    protected override Func<Person, string> GetIdValue => p => p.StrongId;

    public PersonRepository(Neo4jService neo4j) : base(neo4j) { }
}

/// <summary>
/// Generic repository wrapper for Organization entities.
/// </summary>
public class OrganizationRepository : GenericEntityRepository<Organization>
{
    protected override string NodeLabel => "Organization";
    protected override string IdProperty => "OrgId";
    protected override Func<Organization, string> GetIdValue => o => o.OrgId;

    public OrganizationRepository(Neo4jService neo4j) : base(neo4j) { }
}

/// <summary>
/// Generic repository wrapper for Location entities.
/// </summary>
public class LocationRepository : GenericEntityRepository<Location>
{
    protected override string NodeLabel => "Location";
    protected override string IdProperty => "LocationId";
    protected override Func<Location, string> GetIdValue => l => l.LocationId;

    public LocationRepository(Neo4jService neo4j) : base(neo4j) { }
}

/// <summary>
/// Generic repository wrapper for Skill entities.
/// </summary>
public class SkillRepository : GenericEntityRepository<Skill>
{
    protected override string NodeLabel => "Skill";
    protected override string IdProperty => "SkillId";
    protected override Func<Skill, string> GetIdValue => s => s.SkillId;

    public SkillRepository(Neo4jService neo4j) : base(neo4j) { }
}

/// <summary>
/// Generic repository wrapper for Education entities.
/// </summary>
public class EducationRepository : GenericEntityRepository<Education>
{
    protected override string NodeLabel => "Education";
    protected override string IdProperty => "EducationId";
    protected override Func<Education, string> GetIdValue => e => e.EducationId;

    public EducationRepository(Neo4jService neo4j) : base(neo4j) { }
}

/// <summary>
/// Generic repository wrapper for Course entities.
/// </summary>
public class CourseRepository : GenericEntityRepository<Course>
{
    protected override string NodeLabel => "Course";
    protected override string IdProperty => "CourseId";
    protected override Func<Course, string> GetIdValue => c => c.CourseId;

    public CourseRepository(Neo4jService neo4j) : base(neo4j) { }
}

/// <summary>
/// Generic repository wrapper for Department entities.
/// </summary>
public class DepartmentRepository : GenericEntityRepository<Department>
{
    protected override string NodeLabel => "Department";
    protected override string IdProperty => "DepartmentId";
    protected override Func<Department, string> GetIdValue => d => d.DepartmentId;

    public DepartmentRepository(Neo4jService neo4j) : base(neo4j) { }
}

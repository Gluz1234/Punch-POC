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
    protected override string IdProperty => "EntityId";
    protected override Func<Person, string> GetIdValue => p => p.EntityId;

    public PersonRepository(Neo4jService neo4j) : base(neo4j) { }
}

/// <summary>
/// Generic repository wrapper for Organization entities.
/// </summary>
public class OrganizationRepository : GenericEntityRepository<Organization>
{
    protected override string NodeLabel => "Organization";
    protected override string IdProperty => "EntityId";
    protected override Func<Organization, string> GetIdValue => o => o.EntityId;

    public OrganizationRepository(Neo4jService neo4j) : base(neo4j) { }
}

/// <summary>
/// Generic repository wrapper for Location entities.
/// </summary>
public class LocationRepository : GenericEntityRepository<Location>
{
    protected override string NodeLabel => "Location";
    protected override string IdProperty => "EntityId";
    protected override Func<Location, string> GetIdValue => l => l.EntityId;

    public LocationRepository(Neo4jService neo4j) : base(neo4j) { }
}

/// <summary>
/// Generic repository wrapper for Skill entities.
/// </summary>
public class SkillRepository : GenericEntityRepository<Skill>
{
    protected override string NodeLabel => "Skill";
    protected override string IdProperty => "EntityId";
    protected override Func<Skill, string> GetIdValue => s => s.EntityId;

    public SkillRepository(Neo4jService neo4j) : base(neo4j) { }
}

/// <summary>
/// Generic repository wrapper for Education entities.
/// </summary>
public class EducationRepository : GenericEntityRepository<Education>
{
    protected override string NodeLabel => "Education";
    protected override string IdProperty => "EntityId";
    protected override Func<Education, string> GetIdValue => e => e.EntityId;

    public EducationRepository(Neo4jService neo4j) : base(neo4j) { }
}

/// <summary>
/// Generic repository wrapper for Course entities.
/// </summary>
public class CourseRepository : GenericEntityRepository<Course>
{
    protected override string NodeLabel => "Course";
    protected override string IdProperty => "EntityId";
    protected override Func<Course, string> GetIdValue => c => c.EntityId;

    public CourseRepository(Neo4jService neo4j) : base(neo4j) { }
}

/// <summary>
/// Generic repository wrapper for Department entities.
/// </summary>
public class DepartmentRepository : GenericEntityRepository<Department>
{
    protected override string NodeLabel => "Department";
    protected override string IdProperty => "EntityId";
    protected override Func<Department, string> GetIdValue => d => d.EntityId;

    public DepartmentRepository(Neo4jService neo4j) : base(neo4j) { }
}

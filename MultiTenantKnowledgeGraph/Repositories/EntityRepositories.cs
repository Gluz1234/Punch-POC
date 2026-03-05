using Neo4j.Driver;
using MultiTenantKnowledgeGraph.Models;

namespace MultiTenantKnowledgeGraph.Repositories;

// ══════════════════════════════════════════════════════════════════════════════
// LOCATION REPOSITORY
// ══════════════════════════════════════════════════════════════════════════════

public class LocationRepository
{
    private readonly Neo4jService _neo4j;
    public LocationRepository(Neo4jService neo4j) => _neo4j = neo4j;

    public async Task<Location> UpsertAsync(Location location)
    {
        const string cypher = @"
            MERGE (l:Location {location_id: $locationId})
            ON CREATE SET
                l.name          = $name,
                l.location_type = $locType,
                l.latitude      = $lat,
                l.longitude     = $lon,
                l.postal_code   = $postalCode,
                l.population    = $population
            ON MATCH SET
                l.name          = $name,
                l.location_type = $locType,
                l.latitude      = $lat,
                l.longitude     = $lon,
                l.postal_code   = $postalCode,
                l.population    = $population
            RETURN l";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            locationId = location.LocationId,
            name       = location.Name,
            locType    = location.LocationType,
            lat        = location.Latitude,
            lon        = location.Longitude,
            postalCode = location.PostalCode,
            population = location.Population
        });
        await result.ConsumeAsync();
        return location;
    }

    public async Task<Location?> GetByIdAsync(string locationId)
    {
        const string cypher = "MATCH (l:Location {location_id: $locationId}) RETURN l";
        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new { locationId });
        if (await result.FetchAsync())
            return MapNode(result.Current["l"].As<INode>());
        return null;
    }

    public async Task<List<Location>> GetAllAsync()
    {
        const string cypher = "MATCH (l:Location) RETURN l ORDER BY l.name";
        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher);
        var list = new List<Location>();
        await foreach (var r in result) list.Add(MapNode(r["l"].As<INode>()));
        return list;
    }

    public async Task<bool> DeleteAsync(string locationId)
    {
        const string cypher = "MATCH (l:Location {location_id: $locationId}) DETACH DELETE l RETURN count(l) AS d";
        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new { locationId });
        var record = await result.SingleAsync();
        return record["d"].As<long>() > 0;
    }

    private static Location MapNode(INode n) => new()
    {
        LocationId   = n["location_id"].As<string>(),
        Name         = n["name"].As<string>(),
        LocationType = n["location_type"].As<string>(),
        Latitude     = n.Properties.ContainsKey("latitude")   ? n["latitude"].As<double?>()  : null,
        Longitude    = n.Properties.ContainsKey("longitude")  ? n["longitude"].As<double?>() : null,
        PostalCode   = n.Properties.ContainsKey("postal_code")? n["postal_code"].As<string?>(): null,
        Population   = n.Properties.ContainsKey("population") ? n["population"].As<long?>()  : null,
    };
}

// ══════════════════════════════════════════════════════════════════════════════
// SKILL REPOSITORY
// ══════════════════════════════════════════════════════════════════════════════

public class SkillRepository
{
    private readonly Neo4jService _neo4j;
    public SkillRepository(Neo4jService neo4j) => _neo4j = neo4j;

    public async Task<Skill> UpsertAsync(Skill skill)
    {
        const string cypher = @"
            MERGE (s:Skill {skill_id: $skillId})
            ON CREATE SET
                s.name        = $name,
                s.category    = $category,
                s.description = $description,
                s.level_scale = $levelScale
            ON MATCH SET
                s.name        = $name,
                s.category    = $category,
                s.description = $description,
                s.level_scale = $levelScale
            RETURN s";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            skillId     = skill.SkillId,
            name        = skill.Name,
            category    = skill.Category,
            description = skill.Description,
            levelScale  = skill.LevelScale
        });
        await result.ConsumeAsync();
        return skill;
    }

    public async Task<Skill?> GetByIdAsync(string skillId)
    {
        const string cypher = "MATCH (s:Skill {skill_id: $skillId}) RETURN s";
        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new { skillId });
        if (await result.FetchAsync())
            return MapNode(result.Current["s"].As<INode>());
        return null;
    }

    public async Task<List<Skill>> GetAllAsync()
    {
        const string cypher = "MATCH (s:Skill) RETURN s ORDER BY s.name";
        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher);
        var list = new List<Skill>();
        await foreach (var r in result) list.Add(MapNode(r["s"].As<INode>()));
        return list;
    }

    public async Task<bool> DeleteAsync(string skillId)
    {
        const string cypher = "MATCH (s:Skill {skill_id: $skillId}) DETACH DELETE s RETURN count(s) AS d";
        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new { skillId });
        var record = await result.SingleAsync();
        return record["d"].As<long>() > 0;
    }

    private static Skill MapNode(INode n) => new()
    {
        SkillId     = n["skill_id"].As<string>(),
        Name        = n["name"].As<string>(),
        Category    = n.Properties.ContainsKey("category")    ? n["category"].As<string?>()    : null,
        Description = n.Properties.ContainsKey("description") ? n["description"].As<string?>() : null,
        LevelScale  = n.Properties.ContainsKey("level_scale") ? n["level_scale"].As<string?>() : null,
    };
}

// ══════════════════════════════════════════════════════════════════════════════
// EDUCATION REPOSITORY
// ══════════════════════════════════════════════════════════════════════════════

public class EducationRepository
{
    private readonly Neo4jService _neo4j;
    public EducationRepository(Neo4jService neo4j) => _neo4j = neo4j;

    public async Task<Education> UpsertAsync(Education edu)
    {
        const string cypher = @"
            MERGE (e:Education {education_id: $educationId})
            ON CREATE SET
                e.title          = $title,
                e.education_type = $eduType,
                e.field_of_study = $field,
                e.start_date     = $startDate,
                e.end_date       = $endDate,
                e.grade          = $grade
            ON MATCH SET
                e.title          = $title,
                e.education_type = $eduType,
                e.field_of_study = $field,
                e.start_date     = $startDate,
                e.end_date       = $endDate,
                e.grade          = $grade
            RETURN e";

        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new
        {
            educationId = edu.EducationId,
            title       = edu.Title,
            eduType     = edu.EducationType,
            field       = edu.FieldOfStudy,
            startDate   = edu.StartDate?.ToString("o"),
            endDate     = edu.EndDate?.ToString("o"),
            grade       = edu.Grade
        });
        await result.ConsumeAsync();
        return edu;
    }

    public async Task<Education?> GetByIdAsync(string educationId)
    {
        const string cypher = "MATCH (e:Education {education_id: $educationId}) RETURN e";
        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new { educationId });
        if (await result.FetchAsync())
            return MapNode(result.Current["e"].As<INode>());
        return null;
    }

    public async Task<List<Education>> GetAllAsync()
    {
        const string cypher = "MATCH (e:Education) RETURN e ORDER BY e.title";
        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher);
        var list = new List<Education>();
        await foreach (var r in result) list.Add(MapNode(r["e"].As<INode>()));
        return list;
    }

    public async Task<bool> DeleteAsync(string educationId)
    {
        const string cypher = "MATCH (e:Education {education_id: $educationId}) DETACH DELETE e RETURN count(e) AS d";
        await using var session = _neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new { educationId });
        var record = await result.SingleAsync();
        return record["d"].As<long>() > 0;
    }

    private static Education MapNode(INode n) => new()
    {
        EducationId   = n["education_id"].As<string>(),
        Title         = n["title"].As<string>(),
        EducationType = n["education_type"].As<string>(),
        FieldOfStudy  = n.Properties.ContainsKey("field_of_study") ? n["field_of_study"].As<string?>() : null,
        Grade         = n.Properties.ContainsKey("grade")          ? n["grade"].As<string?>()          : null,
    };
}

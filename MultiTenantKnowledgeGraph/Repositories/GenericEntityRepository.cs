using Neo4j.Driver;
using System.Reflection;

namespace MultiTenantKnowledgeGraph.Repositories;

/// <summary>
/// Generic Repository Base Class
/// Replaces all individual repository classes (PersonRepository, OrganizationRepository, etc.)
///
/// Uses reflection to map entity properties to Neo4j node properties dynamically.
/// Assumes Neo4j property names are snake_case versions of C# property names.
/// </summary>
public abstract class GenericEntityRepository<T> where T : class, new()
{
    protected readonly Neo4jService Neo4j;

    // Override these in derived classes if needed
    protected virtual string NodeLabel => typeof(T).Name;
    protected virtual string IdProperty => "EntityId"; // Override per entity
    protected virtual Func<T, string> GetIdValue => throw new NotImplementedException("Override GetIdValue in derived class");

    public GenericEntityRepository(Neo4jService neo4j) => Neo4j = neo4j;

    /// <summary>
    /// Creates or updates (upserts) an entity using MERGE on the ID property.
    /// </summary>
    public virtual async Task<T> UpsertAsync(T entity)
    {
        var idValue = GetIdValue(entity);
        var properties = GetEntityProperties(entity);

        var setClause = string.Join(", ", properties
            .Select(kvp => $"n.{kvp.Key} = ${kvp.Key}"));

        var cypher = $@"
            MERGE (n:{NodeLabel}:Entity {{{GetSnakeCasePropertyName(IdProperty)}: ${IdProperty}}})
            ON CREATE SET {setClause}
            ON MATCH SET {setClause}
            RETURN n";

        var parameters = new Dictionary<string, object> { { IdProperty, idValue } };
        foreach (var kvp in properties)
        {
            parameters[kvp.Key] = kvp.Value;
        }

        await using var session = Neo4j.OpenSession();
        var result = await session.RunAsync(cypher, parameters);
        await result.ConsumeAsync();
        return entity;
    }

    /// <summary>
    /// Gets all entities of this type.
    /// </summary>
    public virtual async Task<List<T>> GetAllAsync()
    {
        var cypher = $"MATCH (n:{NodeLabel}) RETURN n ORDER BY n.{GetSnakeCasePropertyName(IdProperty)}";

        await using var session = Neo4j.OpenSession();
        var result = await session.RunAsync(cypher);
        var entities = new List<T>();

        await foreach (var record in result)
        {
            entities.Add(MapNode(record["n"].As<INode>()));
        }

        return entities;
    }

    /// <summary>
    /// Gets a single entity by its ID.
    /// </summary>
    public virtual async Task<T?> GetByIdAsync(string id)
    {
        var idFieldSnake = GetSnakeCasePropertyName(IdProperty);
        var cypher = $"MATCH (n:{NodeLabel} {{{idFieldSnake}: ${IdProperty}}}) RETURN n";

        await using var session = Neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new Dictionary<string, object> { { IdProperty, id } });

        if (await result.FetchAsync())
        {
            return MapNode(result.Current["n"].As<INode>());
        }

        return null;
    }

    /// <summary>
    /// Gets entities filtered by a specific property.
    /// </summary>
    public virtual async Task<List<T>> GetByPropertyAsync(string propertyName, object propertyValue)
    {
        var propSnake = GetSnakeCasePropertyName(propertyName);
        var cypher = $"MATCH (n:{NodeLabel} {{{propSnake}: $value}}) RETURN n ORDER BY n.{GetSnakeCasePropertyName(IdProperty)}";

        await using var session = Neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new { value = propertyValue });
        var entities = new List<T>();

        await foreach (var record in result)
        {
            entities.Add(MapNode(record["n"].As<INode>()));
        }

        return entities;
    }

    /// <summary>
    /// Deletes an entity by its ID.
    /// </summary>
    public virtual async Task<bool> DeleteAsync(string id)
    {
        var idFieldSnake = GetSnakeCasePropertyName(IdProperty);
        var cypher = $@"
            MATCH (n:{NodeLabel} {{{idFieldSnake}: $id}})
            DETACH DELETE n
            RETURN count(n) AS deleted";

        await using var session = Neo4j.OpenSession();
        var result = await session.RunAsync(cypher, new { id });
        var record = await result.SingleAsync();
        return record["deleted"].As<long>() > 0;
    }

    /// <summary>
    /// Maps a Neo4j node to a C# entity object using reflection.
    /// Handles snake_case Neo4j properties ↔ PascalCase C# properties.
    /// </summary>
    protected virtual T MapNode(INode node)
    {
        var entity = new T();
        var properties = typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);

        foreach (var prop in properties)
        {
            if (!prop.CanWrite) continue;

            var snakeCasePropertyName = GetSnakeCasePropertyName(prop.Name);

            if (!node.Properties.ContainsKey(snakeCasePropertyName))
            {
                continue;
            }

            try
            {
                var neoValue = node[snakeCasePropertyName];
                var value = ConvertNeo4jValue(neoValue, prop.PropertyType);
                prop.SetValue(entity, value);
            }
            catch
            {
                // Silently skip properties that can't be mapped
            }
        }

        return entity;
    }

    /// <summary>
    /// Gets all non-null entity properties as a dictionary.
    /// Converts PascalCase C# property names to snake_case for Neo4j.
    /// </summary>
    protected virtual Dictionary<string, object?> GetEntityProperties(T entity)
    {
        var result = new Dictionary<string, object?>();
        var properties = typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance);

        foreach (var prop in properties)
        {
            var value = prop.GetValue(entity);
            if (value == null) continue;

            var snakeCaseName = GetSnakeCasePropertyName(prop.Name);
            result[snakeCaseName] = ConvertPropertyValue(value);
        }

        return result;
    }

    /// <summary>
    /// Converts C# property names to snake_case for Neo4j.
    /// Examples: FirstName → first_name, EntityId → entity_id
    /// </summary>
    protected string GetSnakeCasePropertyName(string propertyName)
    {
        return System.Text.RegularExpressions.Regex.Replace(
            propertyName,
            "(?<!^)([A-Z])",
            "_$1"
        ).ToLower();
    }

    /// <summary>
    /// Converts C# values to Neo4j-compatible values.
    /// </summary>
    private object? ConvertPropertyValue(object value)
    {
        return value switch
        {
            DateTime dt => dt.ToString("o"),
            DateTimeOffset dto => dto.ToString("o"),
            _ => value
        };
    }

    /// <summary>
    /// Converts Neo4j values to C# types.
    /// </summary>
    private object? ConvertNeo4jValue(object neoValue, Type targetType)
    {
        if (neoValue == null) return null;

        if (targetType == typeof(string))
            return neoValue.ToString();

        if (targetType == typeof(int))
            return neoValue is int i ? i : int.Parse(neoValue.ToString()!);

        if (targetType == typeof(long))
            return neoValue is long l ? l : long.Parse(neoValue.ToString()!);

        if (targetType == typeof(double))
            return neoValue is double d ? d : double.Parse(neoValue.ToString()!);

        if (targetType == typeof(bool))
            return neoValue is bool b ? b : bool.Parse(neoValue.ToString()!);

        if (targetType == typeof(DateTime))
            return neoValue is DateTime dt ? dt : DateTime.Parse(neoValue.ToString()!);

        if (targetType == typeof(DateTimeOffset) || targetType == typeof(DateTime?))
            return neoValue is DateTimeOffset dto ? dto : DateTimeOffset.Parse(neoValue.ToString()!);

        return neoValue;
    }
}

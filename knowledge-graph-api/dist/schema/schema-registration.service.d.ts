import { OnApplicationBootstrap } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
export interface EntitySchemaDefinition {
    key: string;
    label: string;
    properties: Array<{
        name: string;
        type: string;
    }>;
}
export interface RelationshipSchemaDefinition {
    relationshipType: string;
    properties: Array<{
        name: string;
        type: string;
    }>;
}
export declare class SchemaRegistrationService implements OnApplicationBootstrap {
    private readonly neo4j;
    constructor(neo4j: Neo4jService);
    onApplicationBootstrap(): Promise<void>;
    registerAllBaseEntities(): Promise<void>;
    registerAllBuiltinSubtypes(): Promise<void>;
    upsertEntitySchema(entity: EntitySchemaDefinition): Promise<void>;
    getAllEntitySchemas(): Promise<EntitySchemaDefinition[]>;
    getEntitySchema(label: string): Promise<EntitySchemaDefinition | null>;
    ensureEntitySchema(key: string): Promise<void>;
    private convertEntityConfigToSchema;
    registerUserDefinedEntity(key: string, label: string, properties: Array<{
        name: string;
        type: string;
    }>): Promise<void>;
}

import { Neo4jService } from '../neo4j/neo4j.service';
export declare class SchemaService {
    private readonly neo4j;
    constructor(neo4j: Neo4jService);
    getLabels(): Promise<string[]>;
    getRelationshipTypes(): Promise<string[]>;
    getConstraints(): Promise<{
        name: any;
        type: any;
        entityType: any;
        labelsOrTypes: any;
        properties: any;
    }[]>;
    getIndexes(): Promise<{
        name: any;
        type: any;
        state: any;
        labelsOrTypes: any;
        properties: any;
    }[]>;
    getPropertiesForLabel(label: string): Promise<{
        label: string;
        properties: {
            name: any;
            type: string;
        }[];
        totalProperties: number;
    }>;
    getPropertiesForRelType(relType: string): Promise<{
        relationshipType: string;
        properties: {
            name: any;
            type: string;
        }[];
        totalProperties: number;
    }>;
    getFullSchema(): Promise<{
        nodeLabels: {
            label: string;
            properties: {
                name: any;
                type: string;
            }[];
            totalProperties: number;
        }[];
        relationshipTypes: {
            relationshipType: string;
            properties: {
                name: any;
                type: string;
            }[];
            totalProperties: number;
        }[];
        constraints: {
            name: any;
            type: any;
            entityType: any;
            labelsOrTypes: any;
            properties: any;
        }[];
    }>;
    getCounts(): Promise<{
        label: string;
        count: any;
    }[]>;
    getTenants(): Promise<any[]>;
}

import { SchemaService } from './schema.service';
export declare class SchemaController {
    private readonly schemaService;
    constructor(schemaService: SchemaService);
    getFullSchema(): Promise<{
        nodeLabels: {
            label: string;
            properties: any[];
        }[];
        relationshipTypes: {
            relationshipType: string;
            properties: any[];
        }[];
        constraints: {
            name: any;
            type: any;
            entityType: any;
            labelsOrTypes: any;
            properties: any;
        }[];
    }>;
    getLabels(): Promise<string[]>;
    getLabelProperties(label: string): Promise<{
        label: string;
        properties: any[];
    }>;
    getRelationshipTypes(): Promise<string[]>;
    getRelTypeProperties(type: string): Promise<{
        relationshipType: string;
        properties: any[];
    }>;
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
    getCounts(): Promise<{
        label: string;
        count: any;
    }[]>;
    getTenants(): Promise<any[]>;
}

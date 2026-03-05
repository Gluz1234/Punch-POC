import { Neo4jService } from '../neo4j/neo4j.service';
export declare class DynamicService {
    private readonly neo4j;
    constructor(neo4j: Neo4jService);
    upsertNode(dto: any): Promise<{
        labels: any;
    }>;
    findByLabel(label: string, limit?: number): Promise<{
        labels: any;
    }[]>;
    findOne(label: string, idField: string, id: string): Promise<{
        labels: any;
    }>;
    updateNode(label: string, idField: string, id: string, properties: Record<string, any>): Promise<{
        labels: any;
    }>;
    deleteNode(label: string, idField: string, id: string): Promise<{
        deleted: boolean;
        label: string;
        idField: string;
        id: string;
    }>;
    addLabel(label: string, idField: string, id: string, newLabel: string): Promise<{
        labels: any;
    }>;
    createRelationship(dto: any): Promise<{
        type: any;
        properties: Record<string, any>;
        from: {
            labels: any;
            id: any;
        };
        to: {
            labels: any;
            id: any;
        };
    }>;
    getRelationships(label: string, idField: string, id: string, direction?: string): Promise<{
        type: any;
        properties: Record<string, any>;
        otherNode: {
            labels: any;
            id: any;
        };
    }[]>;
    deleteRelationship(dto: any): Promise<{
        deleted: boolean;
        type: any;
        fromId: any;
        toId: any;
    }>;
    private sanitizePropertyKeys;
}

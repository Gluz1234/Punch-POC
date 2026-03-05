import { DynamicService } from './dynamic.service';
export declare class DynamicController {
    private readonly dynamicService;
    constructor(dynamicService: DynamicService);
    createNode(dto: any): Promise<{
        labels: any;
    }>;
    findByLabel(label: string, limit?: string): Promise<{
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
}

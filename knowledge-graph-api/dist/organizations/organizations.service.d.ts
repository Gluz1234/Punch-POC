import { Neo4jService } from '../neo4j/neo4j.service';
export declare class OrganizationsService {
    private readonly neo4j;
    constructor(neo4j: Neo4jService);
    upsert(dto: any): Promise<Record<string, any>>;
    findAll(): Promise<Record<string, any>[]>;
    findOne(orgId: string): Promise<Record<string, any>>;
    remove(orgId: string): Promise<{
        deleted: boolean;
        orgId: string;
    }>;
}

import { Neo4jService } from '../neo4j/neo4j.service';
export declare class DepartmentsService {
    private readonly neo4j;
    constructor(neo4j: Neo4jService);
    upsert(dto: any): Promise<Record<string, any>>;
    findAll(): Promise<Record<string, any>[]>;
    findByOrg(orgId: string): Promise<Record<string, any>[]>;
    findOne(departmentId: string): Promise<Record<string, any>>;
    remove(departmentId: string): Promise<{
        deleted: boolean;
        departmentId: string;
    }>;
}

import { Neo4jService } from '../neo4j/neo4j.service';
export declare class CoursesService {
    private readonly neo4j;
    constructor(neo4j: Neo4jService);
    upsert(dto: any): Promise<Record<string, any>>;
    findAll(): Promise<Record<string, any>[]>;
    findByOrg(orgId: string): Promise<Record<string, any>[]>;
    findOne(courseId: string): Promise<Record<string, any>>;
    remove(courseId: string): Promise<{
        deleted: boolean;
        courseId: string;
    }>;
}

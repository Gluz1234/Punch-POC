import { Neo4jService } from '../neo4j/neo4j.service';
export declare class EducationService {
    private readonly neo4j;
    constructor(neo4j: Neo4jService);
    upsert(dto: any): Promise<Record<string, any>>;
    findAll(): Promise<Record<string, any>[]>;
    findOne(educationId: string): Promise<Record<string, any>>;
    remove(educationId: string): Promise<{
        deleted: boolean;
        educationId: string;
    }>;
}

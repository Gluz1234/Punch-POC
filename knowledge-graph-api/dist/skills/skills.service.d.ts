import { Neo4jService } from '../neo4j/neo4j.service';
export declare class SkillsService {
    private readonly neo4j;
    constructor(neo4j: Neo4jService);
    upsert(dto: any): Promise<Record<string, any>>;
    findAll(): Promise<Record<string, any>[]>;
    findOne(skillId: string): Promise<Record<string, any>>;
    remove(skillId: string): Promise<{
        deleted: boolean;
        skillId: string;
    }>;
}

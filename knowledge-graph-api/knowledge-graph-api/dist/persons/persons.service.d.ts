import { Neo4jService } from '../neo4j/neo4j.service';
export declare class PersonsService {
    private readonly neo4j;
    constructor(neo4j: Neo4jService);
    upsert(dto: any): Promise<Record<string, any>>;
    findAll(): Promise<{
        labels: any;
    }[]>;
    findOne(strongId: string): Promise<{
        labels: any;
    }>;
    remove(strongId: string): Promise<{
        deleted: boolean;
        strongId: string;
    }>;
}

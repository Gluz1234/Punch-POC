import { Neo4jService } from '../neo4j/neo4j.service';
export declare class LocationsService {
    private readonly neo4j;
    constructor(neo4j: Neo4jService);
    upsert(dto: any): Promise<Record<string, any>>;
    findAll(): Promise<Record<string, any>[]>;
    findOne(locationId: string): Promise<Record<string, any>>;
    remove(locationId: string): Promise<{
        deleted: boolean;
        locationId: string;
    }>;
}

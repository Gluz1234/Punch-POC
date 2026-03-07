import { Neo4jService } from '../neo4j/neo4j.service';
import { EntityConfig } from './entity-config';
import { SchemaRegistrationService } from '../schema/schema-registration.service';
export declare class GenericEntityService {
    private readonly neo4j;
    private readonly schemaRegistration;
    constructor(neo4j: Neo4jService, schemaRegistration: SchemaRegistrationService);
    upsert(config: EntityConfig, dto: any): Promise<{
        labels: any;
    }>;
    findAll(config: EntityConfig, limit?: number): Promise<{
        labels: any;
    }[]>;
    findOne(config: EntityConfig, id: string): Promise<{
        labels: any;
    }>;
    findBy(config: EntityConfig, filterField: string, filterValue: string, limit?: number): Promise<{
        labels: any;
    }[]>;
    update(config: EntityConfig, id: string, dto: any): Promise<{
        labels: any;
    }>;
    remove(config: EntityConfig, id: string): Promise<{
        deleted: boolean;
        id: string;
        label: string;
    }>;
    private sanitizePropertyKeys;
    private formatResult;
}

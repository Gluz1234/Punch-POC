import { OnApplicationBootstrap } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { PromotionSchemaService } from './promotion-schema.service';
export declare class PromotionsService implements OnApplicationBootstrap {
    private readonly neo4j;
    private readonly promotionSchema;
    constructor(neo4j: Neo4jService, promotionSchema: PromotionSchemaService);
    onApplicationBootstrap(): Promise<void>;
    getLabels(strongId: string): Promise<{
        strongId: string;
        labels: any;
    }>;
    promoteToStudent(strongId: string, dto: any): Promise<{
        labels: any;
    }>;
    promoteToEmployee(strongId: string, dto: any): Promise<{
        labels: any;
    }>;
    promoteToResident(strongId: string, dto: any): Promise<{
        labels: any;
    }>;
    promoteToResearcher(strongId: string, dto: any): Promise<{
        labels: any;
    }>;
    promoteToArtist(strongId: string, dto: any): Promise<{
        labels: any;
    }>;
    promoteToSubtype(strongId: string, subtype: string, properties: Record<string, any>): Promise<{
        labels: any;
    }>;
    private sanitizePropertyKeys;
    private ensureSubtypeDefinition;
    getStudents(tenantId: string): Promise<{
        labels: any;
        enrolledAt: any;
    }[]>;
    getEmployees(tenantId: string): Promise<{
        labels: any;
        worksAt: any;
    }[]>;
    getResearchers(): Promise<{
        labels: any;
    }[]>;
    getResidents(tenantId: string): Promise<{
        labels: any;
        location: any;
    }[]>;
    getArtists(): Promise<{
        labels: any;
    }[]>;
}
export interface TypedPropertiesResponse {
    strongId: string;
    labels: string[];
    base: {
        label: string;
        properties: Record<string, any>;
    };
    subtypes: {
        label: string;
        properties: Record<string, any>;
    }[];
    unknownProperties: Record<string, any>;
}
export declare class PromotionProjectionService {
    private readonly neo4j;
    private readonly schema;
    constructor(neo4j: Neo4jService, schema: PromotionSchemaService);
    getPersonTypedProperties(strongId: string): Promise<TypedPropertiesResponse>;
}

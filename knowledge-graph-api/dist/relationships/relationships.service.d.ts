import { Neo4jService } from '../neo4j/neo4j.service';
export declare class RelationshipsService {
    private readonly neo4j;
    constructor(neo4j: Neo4jService);
    getPersonRelationships(strongId: string, tenantId?: string): Promise<{
        type: any;
        tenantId: any;
        targetLabels: any;
        targetId: any;
        properties: Record<string, any>;
    }[]>;
    createEnrolledIn(dto: any): Promise<any>;
    deleteEnrolledIn(personId: string, orgId: string, tenantId: string): Promise<{
        deleted: boolean;
    }>;
    createWorksAt(dto: any): Promise<any>;
    deleteWorksAt(personId: string, orgId: string, tenantId: string): Promise<{
        deleted: boolean;
    }>;
    createLivesIn(dto: any): Promise<any>;
    deleteLivesIn(personId: string, locationId: string, tenantId: string): Promise<{
        deleted: boolean;
    }>;
    createHasSkill(dto: any): Promise<any>;
    deleteHasSkill(personId: string, skillId: string, tenantId: string): Promise<{
        deleted: boolean;
    }>;
    createCompleted(dto: any): Promise<any>;
    createProvidedBy(dto: any): Promise<any>;
    createRequiresSkill(dto: any): Promise<any>;
    createHasAdvisor(dto: any): Promise<any>;
    createRegisteredFor(dto: any): Promise<any>;
    createReportsTo(dto: any): Promise<any>;
    createWorksIn(dto: any): Promise<any>;
    createRegisteredAt(dto: any): Promise<any>;
    createAffiliatedWith(dto: any): Promise<any>;
    createOfferedBy(dto: any): Promise<any>;
    createBelongsTo(dto: any): Promise<any>;
}

import { RelationshipsService } from './relationships.service';
export declare class RelationshipsController {
    private readonly relationshipsService;
    constructor(relationshipsService: RelationshipsService);
    getPersonRelationships(strongId: string): Promise<{
        type: any;
        tenantId: any;
        targetLabels: any;
        targetId: any;
        properties: Record<string, any>;
    }[]>;
    getPersonRelationshipsByTenant(strongId: string, tenantId: string): Promise<{
        type: any;
        tenantId: any;
        targetLabels: any;
        targetId: any;
        properties: Record<string, any>;
    }[]>;
    createEnrolledIn(dto: any): Promise<any>;
    createWorksAt(dto: any): Promise<any>;
    createLivesIn(dto: any): Promise<any>;
    createHasSkill(dto: any): Promise<any>;
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
    deleteEnrolledIn(personId: string, orgId: string, tenantId: string): Promise<{
        deleted: boolean;
    }>;
    deleteWorksAt(personId: string, orgId: string, tenantId: string): Promise<{
        deleted: boolean;
    }>;
    deleteLivesIn(personId: string, locationId: string, tenantId: string): Promise<{
        deleted: boolean;
    }>;
    deleteHasSkill(personId: string, skillId: string, tenantId: string): Promise<{
        deleted: boolean;
    }>;
}

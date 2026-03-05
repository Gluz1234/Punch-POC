import { GenericQueryService } from './generic-query.service';
export interface SimplifiedQueryConfig {
    entity: string;
    id?: string;
    where?: Record<string, any>;
    relationships?: SimplifiedRelationship[];
    tenantId?: string;
    orderBy?: string;
    limit?: number;
    returns?: string[];
}
export interface SimplifiedRelationship {
    type: string;
    direction?: '->' | '<-' | '--';
    target: string;
    filters?: Record<string, any>;
    relationshipFilters?: Record<string, any>;
}
export declare class SimplifiedQueryService {
    private readonly genericQuery;
    constructor(genericQuery: GenericQueryService);
    execute(config: SimplifiedQueryConfig): Promise<Record<string, any>[]>;
    private simplifyToFull;
    getPersons(tenantId?: string, limit?: number): Promise<Record<string, any>[]>;
    getPersonsAtOrg(orgId: string, tenantId: string, limit?: number): Promise<Record<string, any>[]>;
    getPersonsEnrolledAt(orgId: string, tenantId: string, limit?: number): Promise<Record<string, any>[]>;
    getPersonsWithSkill(skillId: string, tenantId?: string, limit?: number): Promise<Record<string, any>[]>;
    getPersonMultipleRelationships(personId: string, tenantId: string): Promise<Record<string, any>[]>;
}

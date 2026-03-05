import { SimplifiedQueryService, SimplifiedQueryConfig } from './simplified-query.service';
export declare class SimplifiedQueryController {
    private readonly queryService;
    constructor(queryService: SimplifiedQueryService);
    search(config: SimplifiedQueryConfig): Promise<Record<string, any>[]>;
    getPersons(dto: {
        tenantId?: string;
        limit?: number;
    }): Promise<Record<string, any>[]>;
    getPersonsAtOrg(dto: {
        orgId: string;
        tenantId: string;
        limit?: number;
    }): Promise<Record<string, any>[]>;
    getPersonsEnrolledAt(dto: {
        orgId: string;
        tenantId: string;
        limit?: number;
    }): Promise<Record<string, any>[]>;
    getPersonsWithSkill(dto: {
        skillId: string;
        tenantId?: string;
        limit?: number;
    }): Promise<Record<string, any>[]>;
    getPersonProfile(dto: {
        personId: string;
        tenantId: string;
    }): Promise<Record<string, any>[]>;
}

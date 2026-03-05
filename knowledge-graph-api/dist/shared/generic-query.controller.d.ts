import { GenericQueryService, QueryBuilderConfig } from './generic-query.service';
export declare class GenericQueryController {
    private readonly queryService;
    constructor(queryService: GenericQueryService);
    executeQuery(config: QueryBuilderConfig): Promise<Record<string, any>[]>;
    getPersonsWorkingAtOrg(dto: {
        orgId: string;
        tenantId: string;
    }): Promise<Record<string, any>[]>;
    getPersonsEnrolledInOrg(dto: {
        orgId: string;
        tenantId: string;
    }): Promise<Record<string, any>[]>;
    getPersonsWithMultipleRoles(dto: {
        personId: string;
        tenantId: string;
    }): Promise<Record<string, any>[]>;
}

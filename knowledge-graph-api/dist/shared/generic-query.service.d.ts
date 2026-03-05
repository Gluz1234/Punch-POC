import { Neo4jService } from '../neo4j/neo4j.service';
export interface EntityReference {
    config: any;
    alias: string;
    filterFields?: Record<string, any>;
}
export interface RelationshipStep {
    type: string;
    direction: '->' | '<-' | '--';
    targetEntity: EntityReference;
    filters?: Record<string, any>;
}
export interface QueryBuilderConfig {
    mainEntity: EntityReference;
    relationships?: RelationshipStep[];
    returns: string[];
    whereConditions?: Record<string, any>;
    tenantId?: string;
    orderBy?: string;
    limit?: number;
    distinct?: boolean;
}
export declare class GenericQueryService {
    private readonly neo4j;
    constructor(neo4j: Neo4jService);
    execute(config: QueryBuilderConfig): Promise<Record<string, any>[]>;
    private buildQuery;
    private buildMatchClauses;
    private buildWhereClauses;
    private formatResult;
    getPersonsWorkingAtOrg(orgId: string, tenantId: string): Promise<Record<string, any>[]>;
    getPersonsEnrolledInOrg(orgId: string, tenantId: string): Promise<Record<string, any>[]>;
    getPersonsWithMultipleRoles(personId: string, tenantId: string): Promise<Record<string, any>[]>;
}

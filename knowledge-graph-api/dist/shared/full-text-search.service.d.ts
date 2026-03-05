import { Neo4jService } from '../neo4j/neo4j.service';
export interface FullTextSearchResult {
    entity: string;
    id: string;
    score: number;
    data: Record<string, any>;
}
export interface FullTextSearchConfig {
    entity: string;
    query: string;
    fields?: string[];
    where?: string;
    tenantId?: string;
    limit?: number;
}
export declare class FullTextSearchService {
    private readonly neo4j;
    private searchIndexes;
    private fulltextAvailable;
    constructor(neo4j: Neo4jService);
    initializeIndexes(): Promise<void>;
    private checkFulltextAvailability;
    private createIndexForEntity;
    search(config: FullTextSearchConfig): Promise<FullTextSearchResult[]>;
    private searchFulltext;
    private searchFallback;
    searchPersons(query: string, tenantId?: string, limit?: number): Promise<FullTextSearchResult[]>;
    searchOrganizations(query: string, limit?: number): Promise<FullTextSearchResult[]>;
    searchSkills(query: string, limit?: number): Promise<FullTextSearchResult[]>;
    searchCourses(query: string, limit?: number): Promise<FullTextSearchResult[]>;
    searchWithFilter(entity: string, query: string, whereClause: string, limit?: number): Promise<FullTextSearchResult[]>;
    advancedSearch(entity: string, luceneQuery: string, limit?: number): Promise<FullTextSearchResult[]>;
    private hasMultiTenantSupport;
}

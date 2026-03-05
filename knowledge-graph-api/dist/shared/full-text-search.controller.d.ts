import { FullTextSearchService } from './full-text-search.service';
export declare class FullTextSearchController {
    private readonly searchService;
    constructor(searchService: FullTextSearchService);
    searchPersons(query?: string, tenantId?: string, limit?: string): Promise<import("./full-text-search.service").FullTextSearchResult[]>;
    searchOrganizations(query?: string, limit?: string): Promise<import("./full-text-search.service").FullTextSearchResult[]>;
    searchSkills(query?: string, limit?: string): Promise<import("./full-text-search.service").FullTextSearchResult[]>;
    searchCourses(query?: string, limit?: string): Promise<import("./full-text-search.service").FullTextSearchResult[]>;
    advancedSearch(entity?: string, query?: string, limit?: string): Promise<import("./full-text-search.service").FullTextSearchResult[]>;
    initializeIndexes(): Promise<{
        status: string;
        message: string;
    }>;
}

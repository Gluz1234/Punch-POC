import { Neo4jService } from '../neo4j/neo4j.service';
export declare class PromotionsService {
    private readonly neo4j;
    constructor(neo4j: Neo4jService);
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
}

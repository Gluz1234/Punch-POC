import { PromotionsService } from './promotions.service';
export declare class PromotionsController {
    private readonly promotionsService;
    constructor(promotionsService: PromotionsService);
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

import { QueryService } from './query.service';
export declare class QueryController {
    private readonly queryService;
    constructor(queryService: QueryService);
    enrolledInOrg(orgId: string, tenantId: string): Promise<{
        person: {
            labels: any;
        };
        program: any;
        startDate: any;
    }[]>;
    worksAtOrg(orgId: string, tenantId: string): Promise<{
        person: {
            labels: any;
        };
        jobTitle: any;
        startDate: any;
    }[]>;
    livesInLocation(locationId: string, tenantId?: string): Promise<{
        person: {
            labels: any;
        };
        tenantId: any;
        residenceType: any;
    }[]>;
    registeredAtLocation(locationId: string, tenantId: string): Promise<{
        person: {
            labels: any;
        };
        since: any;
        addressType: any;
    }[]>;
    enrolledAndWorking(orgA: string, tenantA: string, orgB: string, tenantB: string): Promise<{
        person: {
            labels: any;
        };
        enrolled: {
            org: any;
            program: any;
            tenant: string;
        };
        worksAt: {
            org: any;
            title: any;
            tenant: string;
        };
    }[]>;
    multipleEmployers(tenantA: string, tenantB: string): Promise<{
        person: {
            labels: any;
        };
        jobA: {
            org: any;
            title: any;
            tenant: string;
        };
        jobB: {
            org: any;
            title: any;
            tenant: string;
        };
    }[]>;
    withSkill(skillId: string): Promise<{
        person: {
            labels: any;
        };
        tenantId: any;
        level: any;
    }[]>;
    tenantsForPerson(strongId: string): Promise<any[]>;
    orgChart(orgId: string, tenantId: string): Promise<{
        employee: {
            labels: any;
        };
        jobTitle: any;
        reportsTo: {
            strongId: any;
            name: any;
        };
    }[]>;
    courseRegistrations(courseId: string, tenantId: string): Promise<{
        student: {
            labels: any;
        };
        grade: any;
        status: any;
        term: any;
    }[]>;
    personsByLabel(label: string, tenantId?: string): Promise<{
        labels: any;
    }[]>;
}

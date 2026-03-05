import { Neo4jService } from '../neo4j/neo4j.service';
export declare class QueryService {
    private readonly neo4j;
    constructor(neo4j: Neo4jService);
    getPersonsEnrolledInOrg(orgId: string, tenantId: string): Promise<{
        person: {
            labels: any;
        };
        program: any;
        startDate: any;
    }[]>;
    getPersonsWorkingAtOrg(orgId: string, tenantId: string): Promise<{
        person: {
            labels: any;
        };
        jobTitle: any;
        startDate: any;
    }[]>;
    getPersonsLivingInLocation(locationId: string, tenantId?: string): Promise<{
        person: {
            labels: any;
        };
        tenantId: any;
        residenceType: any;
    }[]>;
    getPersonsRegisteredAtLocation(locationId: string, tenantId: string): Promise<{
        person: {
            labels: any;
        };
        since: any;
        addressType: any;
    }[]>;
    getPersonsEnrolledAndWorking(orgA: string, tenantA: string, orgB: string, tenantB: string): Promise<{
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
    getPersonsWithMultipleEmployers(tenantA: string, tenantB: string): Promise<{
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
    getPersonsWithSkill(skillId: string): Promise<{
        person: {
            labels: any;
        };
        tenantId: any;
        level: any;
    }[]>;
    getTenantsForPerson(strongId: string): Promise<any[]>;
    getOrgChart(orgId: string, tenantId: string): Promise<{
        employee: {
            labels: any;
        };
        jobTitle: any;
        reportsTo: {
            strongId: any;
            name: any;
        };
    }[]>;
    getCourseRegistrations(courseId: string, tenantId: string): Promise<{
        student: {
            labels: any;
        };
        grade: any;
        status: any;
        term: any;
    }[]>;
    getPersonsByLabel(label: string, tenantId?: string): Promise<{
        labels: any;
    }[]>;
}

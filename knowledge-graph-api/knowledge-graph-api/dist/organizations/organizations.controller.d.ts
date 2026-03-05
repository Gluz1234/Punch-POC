import { OrganizationsService } from './organizations.service';
export declare class OrganizationsController {
    private readonly organizationsService;
    constructor(organizationsService: OrganizationsService);
    create(dto: any): Promise<Record<string, any>>;
    update(orgId: string, dto: any): Promise<Record<string, any>>;
    findAll(): Promise<Record<string, any>[]>;
    findOne(orgId: string): Promise<Record<string, any>>;
    remove(orgId: string): Promise<{
        deleted: boolean;
        orgId: string;
    }>;
}

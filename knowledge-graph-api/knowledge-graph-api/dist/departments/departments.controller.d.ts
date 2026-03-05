import { DepartmentsService } from './departments.service';
export declare class DepartmentsController {
    private readonly departmentsService;
    constructor(departmentsService: DepartmentsService);
    create(dto: any): Promise<Record<string, any>>;
    update(departmentId: string, dto: any): Promise<Record<string, any>>;
    findAll(): Promise<Record<string, any>[]>;
    findByOrg(orgId: string): Promise<Record<string, any>[]>;
    findOne(departmentId: string): Promise<Record<string, any>>;
    remove(departmentId: string): Promise<{
        deleted: boolean;
        departmentId: string;
    }>;
}

import { EducationService } from './education.service';
export declare class EducationController {
    private readonly educationService;
    constructor(educationService: EducationService);
    create(dto: any): Promise<Record<string, any>>;
    update(educationId: string, dto: any): Promise<Record<string, any>>;
    findAll(): Promise<Record<string, any>[]>;
    findOne(educationId: string): Promise<Record<string, any>>;
    remove(educationId: string): Promise<{
        deleted: boolean;
        educationId: string;
    }>;
}

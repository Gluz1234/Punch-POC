import { CoursesService } from './courses.service';
export declare class CoursesController {
    private readonly coursesService;
    constructor(coursesService: CoursesService);
    create(dto: any): Promise<Record<string, any>>;
    update(courseId: string, dto: any): Promise<Record<string, any>>;
    findAll(): Promise<Record<string, any>[]>;
    findByOrg(orgId: string): Promise<Record<string, any>[]>;
    findOne(courseId: string): Promise<Record<string, any>>;
    remove(courseId: string): Promise<{
        deleted: boolean;
        courseId: string;
    }>;
}

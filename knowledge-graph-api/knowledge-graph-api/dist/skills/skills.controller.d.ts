import { SkillsService } from './skills.service';
export declare class SkillsController {
    private readonly skillsService;
    constructor(skillsService: SkillsService);
    create(dto: any): Promise<Record<string, any>>;
    update(skillId: string, dto: any): Promise<Record<string, any>>;
    findAll(): Promise<Record<string, any>[]>;
    findOne(skillId: string): Promise<Record<string, any>>;
    remove(skillId: string): Promise<{
        deleted: boolean;
        skillId: string;
    }>;
}

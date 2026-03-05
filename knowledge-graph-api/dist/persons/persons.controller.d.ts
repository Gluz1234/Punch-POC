import { PersonsService } from './persons.service';
export declare class PersonsController {
    private readonly personsService;
    constructor(personsService: PersonsService);
    create(dto: any): Promise<Record<string, any>>;
    update(strongId: string, dto: any): Promise<Record<string, any>>;
    findAll(): Promise<{
        labels: any;
    }[]>;
    findOne(strongId: string): Promise<{
        labels: any;
    }>;
    remove(strongId: string): Promise<{
        deleted: boolean;
        strongId: string;
    }>;
}

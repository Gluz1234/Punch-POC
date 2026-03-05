import { LocationsService } from './locations.service';
export declare class LocationsController {
    private readonly locationsService;
    constructor(locationsService: LocationsService);
    create(dto: any): Promise<Record<string, any>>;
    update(locationId: string, dto: any): Promise<Record<string, any>>;
    findAll(): Promise<Record<string, any>[]>;
    findOne(locationId: string): Promise<Record<string, any>>;
    remove(locationId: string): Promise<{
        deleted: boolean;
        locationId: string;
    }>;
}

import { PromotionsService, PromotionProjectionService } from './promotions.service';
import { PromotionSchemaService, PromotionSubtypeDefinitionDto } from './promotion-schema.service';
export declare class PromotionsController {
    private readonly promotionsService;
    private readonly promotionProjection;
    private readonly promotionSchema;
    constructor(promotionsService: PromotionsService, promotionProjection: PromotionProjectionService, promotionSchema: PromotionSchemaService);
    getLabels(strongId: string): Promise<{
        strongId: string;
        labels: any;
    }>;
    getTypedProperties(strongId: string): Promise<import("./promotions.service").TypedPropertiesResponse>;
    upsertSubtypeDefinition(dto: PromotionSubtypeDefinitionDto): Promise<import("./promotion-schema.service").PromotionSubtypeDefinition>;
    getSubtypesForBase(baseLabel: string): Promise<import("./promotion-schema.service").PromotionSubtypeDefinition[]>;
    getAllSubtypes(): Promise<import("./promotion-schema.service").PromotionSubtypeDefinition[]>;
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
    promoteToArtist(strongId: string, dto: any): Promise<{
        labels: any;
    }>;
    promoteToSubtype(strongId: string, subtype: string, properties: Record<string, any>): Promise<{
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
    getArtists(): Promise<{
        labels: any;
    }[]>;
}

import { Neo4jService } from '../neo4j/neo4j.service';
export interface PromotionSubtypeDefinitionDto {
    key: string;
    label: string;
    baseLabel: string;
    properties: string[];
}
export interface PromotionSubtypeDefinition {
    key: string;
    label: string;
    baseLabel: string;
    properties: string[];
}
export declare class PromotionSchemaService {
    private readonly neo4j;
    constructor(neo4j: Neo4jService);
    upsertSubtypeDefinition(dto: PromotionSubtypeDefinitionDto): Promise<PromotionSubtypeDefinition>;
    getSubtypeDefinitionsForBase(baseLabel: string): Promise<PromotionSubtypeDefinition[]>;
    getAllSubtypeDefinitions(): Promise<PromotionSubtypeDefinition[]>;
    getPropertiesForSubtype(key: string): Promise<string[]>;
    upsertSubtypeDefinitionMerging(dto: PromotionSubtypeDefinitionDto): Promise<PromotionSubtypeDefinition>;
    registerMultipleSubtypes(subtypes: PromotionSubtypeDefinitionDto[]): Promise<PromotionSubtypeDefinition[]>;
}

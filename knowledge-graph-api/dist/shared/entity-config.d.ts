export interface EntityConfig {
    key: string;
    label: string;
    idField: string;
    displayName: string;
    route: string;
    properties: Record<string, string>;
    specialQueries?: {
        name: string;
        paramName: string;
        cypherParam: string;
    }[];
}
export declare const ENTITY_CONFIGS: Record<string, EntityConfig>;
export declare function getAllEntities(): EntityConfig[];
export declare function getEntityConfig(key: string): EntityConfig;

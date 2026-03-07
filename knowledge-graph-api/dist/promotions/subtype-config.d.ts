export interface SubtypeDefinition {
    key: string;
    label: string;
    baseLabel: string;
    properties: string[];
}
export declare const BUILTIN_SUBTYPES: SubtypeDefinition[];
export declare function getSubtypeDefinition(label: string): SubtypeDefinition | undefined;
export declare function getSubtypeDefinitionByKey(key: string): SubtypeDefinition | undefined;

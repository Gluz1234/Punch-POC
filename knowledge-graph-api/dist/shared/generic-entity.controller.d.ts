import { EntityConfig } from '../shared/entity-config';
export declare function createGenericEntityController(config: EntityConfig): ConstructorFunction;
type ConstructorFunction = new (...args: any[]) => any;
export {};

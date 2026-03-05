import { DynamicModule } from '@nestjs/common';
import { EntityConfig } from './entity-config';
export declare class GenericEntityModule {
    static forEntity(config: EntityConfig): DynamicModule;
    static forAllEntities(configs: EntityConfig[]): DynamicModule[];
}

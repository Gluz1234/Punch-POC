import { Module, DynamicModule } from '@nestjs/common';
import { GenericEntityService } from './generic-entity.service';
import { createGenericEntityController } from './generic-entity.controller';
import { EntityConfig } from './entity-config';

/**
 * Dynamic Module Factory
 * Creates a NestJS module for any entity config on-the-fly.
 * 
 * Instead of creating PersonModule, CourseModule, etc. manually,
 * this factory generates them from the entity config.
 */
export class GenericEntityModule {
  static forEntity(config: EntityConfig): DynamicModule {
    const controller = createGenericEntityController(config);

    @Module({
      controllers: [controller],
      providers: [GenericEntityService],
      exports: [GenericEntityService],
    })
    class DynamicEntityModule {}

    // Name it appropriately for debugging
    Object.defineProperty(DynamicEntityModule, 'name', {
      value: `${config.label}Module`,
    });

    return {
      module: DynamicEntityModule,
      controllers: [controller],
      providers: [GenericEntityService],
      exports: [GenericEntityService],
    };
  }

  /**
   * Create modules for all configurations.
   * Usage in AppModule:
   *   imports: [
   *     Neo4jModule,
   *     ...GenericEntityModule.forAllEntities(getAllEntities()),
   *   ]
   */
  static forAllEntities(configs: EntityConfig[]): DynamicModule[] {
    return configs.map(config => this.forEntity(config));
  }
}

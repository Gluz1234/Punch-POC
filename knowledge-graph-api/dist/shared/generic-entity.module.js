"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericEntityModule = void 0;
const common_1 = require("@nestjs/common");
const generic_entity_service_1 = require("./generic-entity.service");
const generic_entity_controller_1 = require("./generic-entity.controller");
class GenericEntityModule {
    static forEntity(config) {
        const controller = (0, generic_entity_controller_1.createGenericEntityController)(config);
        let DynamicEntityModule = class DynamicEntityModule {
        };
        DynamicEntityModule = __decorate([
            (0, common_1.Module)({
                controllers: [controller],
                providers: [generic_entity_service_1.GenericEntityService],
                exports: [generic_entity_service_1.GenericEntityService],
            })
        ], DynamicEntityModule);
        Object.defineProperty(DynamicEntityModule, 'name', {
            value: `${config.label}Module`,
        });
        return {
            module: DynamicEntityModule,
            controllers: [controller],
            providers: [generic_entity_service_1.GenericEntityService],
            exports: [generic_entity_service_1.GenericEntityService],
        };
    }
    static forAllEntities(configs) {
        return configs.map(config => this.forEntity(config));
    }
}
exports.GenericEntityModule = GenericEntityModule;
//# sourceMappingURL=generic-entity.module.js.map
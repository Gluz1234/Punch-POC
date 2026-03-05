"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const neo4j_module_1 = require("./neo4j/neo4j.module");
const generic_entity_module_1 = require("./shared/generic-entity.module");
const entity_config_1 = require("./shared/entity-config");
const relationships_module_1 = require("./relationships/relationships.module");
const promotions_module_1 = require("./promotions/promotions.module");
const dynamic_module_1 = require("./dynamic/dynamic.module");
const schema_module_1 = require("./schema/schema.module");
const query_module_1 = require("./query/query.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            neo4j_module_1.Neo4jModule,
            ...generic_entity_module_1.GenericEntityModule.forAllEntities((0, entity_config_1.getAllEntities)()),
            relationships_module_1.RelationshipsModule,
            promotions_module_1.PromotionsModule,
            dynamic_module_1.DynamicModule,
            schema_module_1.SchemaModule,
            query_module_1.QueryModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
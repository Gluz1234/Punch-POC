"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericQueryModule = void 0;
const common_1 = require("@nestjs/common");
const neo4j_module_1 = require("../neo4j/neo4j.module");
const generic_query_service_1 = require("./generic-query.service");
const generic_query_controller_1 = require("./generic-query.controller");
const simplified_query_service_1 = require("./simplified-query.service");
const simplified_query_controller_1 = require("./simplified-query.controller");
const full_text_search_service_1 = require("./full-text-search.service");
const full_text_search_controller_1 = require("./full-text-search.controller");
let GenericQueryModule = class GenericQueryModule {
};
exports.GenericQueryModule = GenericQueryModule;
exports.GenericQueryModule = GenericQueryModule = __decorate([
    (0, common_1.Module)({
        imports: [neo4j_module_1.Neo4jModule],
        providers: [generic_query_service_1.GenericQueryService, simplified_query_service_1.SimplifiedQueryService, full_text_search_service_1.FullTextSearchService],
        controllers: [generic_query_controller_1.GenericQueryController, simplified_query_controller_1.SimplifiedQueryController, full_text_search_controller_1.FullTextSearchController],
        exports: [generic_query_service_1.GenericQueryService, simplified_query_service_1.SimplifiedQueryService, full_text_search_service_1.FullTextSearchService],
    })
], GenericQueryModule);
//# sourceMappingURL=generic-query.module.js.map
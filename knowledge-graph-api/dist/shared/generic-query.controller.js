"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericQueryController = void 0;
const common_1 = require("@nestjs/common");
const generic_query_service_1 = require("./generic-query.service");
let GenericQueryController = class GenericQueryController {
    constructor(queryService) {
        this.queryService = queryService;
    }
    async executeQuery(config) {
        return this.queryService.execute(config);
    }
    async getPersonsWorkingAtOrg(dto) {
        return this.queryService.getPersonsWorkingAtOrg(dto.orgId, dto.tenantId);
    }
    async getPersonsEnrolledInOrg(dto) {
        return this.queryService.getPersonsEnrolledInOrg(dto.orgId, dto.tenantId);
    }
    async getPersonsWithMultipleRoles(dto) {
        return this.queryService.getPersonsWithMultipleRoles(dto.personId, dto.tenantId);
    }
};
exports.GenericQueryController = GenericQueryController;
__decorate([
    (0, common_1.Post)('execute'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GenericQueryController.prototype, "executeQuery", null);
__decorate([
    (0, common_1.Post)('persons-working-at-org'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GenericQueryController.prototype, "getPersonsWorkingAtOrg", null);
__decorate([
    (0, common_1.Post)('persons-enrolled-in-org'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GenericQueryController.prototype, "getPersonsEnrolledInOrg", null);
__decorate([
    (0, common_1.Post)('persons-with-multiple-roles'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GenericQueryController.prototype, "getPersonsWithMultipleRoles", null);
exports.GenericQueryController = GenericQueryController = __decorate([
    (0, common_1.Controller)('query'),
    __metadata("design:paramtypes", [generic_query_service_1.GenericQueryService])
], GenericQueryController);
//# sourceMappingURL=generic-query.controller.js.map
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
exports.SimplifiedQueryController = void 0;
const common_1 = require("@nestjs/common");
const simplified_query_service_1 = require("./simplified-query.service");
let SimplifiedQueryController = class SimplifiedQueryController {
    constructor(queryService) {
        this.queryService = queryService;
    }
    async search(config) {
        return this.queryService.execute(config);
    }
    async getPersons(dto) {
        return this.queryService.getPersons(dto.tenantId, dto.limit);
    }
    async getPersonsAtOrg(dto) {
        return this.queryService.getPersonsAtOrg(dto.orgId, dto.tenantId, dto.limit);
    }
    async getPersonsEnrolledAt(dto) {
        return this.queryService.getPersonsEnrolledAt(dto.orgId, dto.tenantId, dto.limit);
    }
    async getPersonsWithSkill(dto) {
        return this.queryService.getPersonsWithSkill(dto.skillId, dto.tenantId, dto.limit);
    }
    async getPersonProfile(dto) {
        return this.queryService.getPersonMultipleRelationships(dto.personId, dto.tenantId);
    }
};
exports.SimplifiedQueryController = SimplifiedQueryController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SimplifiedQueryController.prototype, "search", null);
__decorate([
    (0, common_1.Post)('persons'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SimplifiedQueryController.prototype, "getPersons", null);
__decorate([
    (0, common_1.Post)('persons-at-org'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SimplifiedQueryController.prototype, "getPersonsAtOrg", null);
__decorate([
    (0, common_1.Post)('persons-enrolled-at'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SimplifiedQueryController.prototype, "getPersonsEnrolledAt", null);
__decorate([
    (0, common_1.Post)('persons-with-skill'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SimplifiedQueryController.prototype, "getPersonsWithSkill", null);
__decorate([
    (0, common_1.Post)('person-profile'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SimplifiedQueryController.prototype, "getPersonProfile", null);
exports.SimplifiedQueryController = SimplifiedQueryController = __decorate([
    (0, common_1.Controller)('search'),
    __metadata("design:paramtypes", [simplified_query_service_1.SimplifiedQueryService])
], SimplifiedQueryController);
//# sourceMappingURL=simplified-query.controller.js.map
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
exports.PromotionsController = void 0;
const common_1 = require("@nestjs/common");
const promotions_service_1 = require("./promotions.service");
let PromotionsController = class PromotionsController {
    constructor(promotionsService) {
        this.promotionsService = promotionsService;
    }
    getLabels(strongId) {
        return this.promotionsService.getLabels(strongId);
    }
    promoteToStudent(strongId, dto) {
        return this.promotionsService.promoteToStudent(strongId, dto);
    }
    promoteToEmployee(strongId, dto) {
        return this.promotionsService.promoteToEmployee(strongId, dto);
    }
    promoteToResident(strongId, dto) {
        return this.promotionsService.promoteToResident(strongId, dto);
    }
    promoteToResearcher(strongId, dto) {
        return this.promotionsService.promoteToResearcher(strongId, dto);
    }
    getStudents(tenantId) {
        return this.promotionsService.getStudents(tenantId);
    }
    getEmployees(tenantId) {
        return this.promotionsService.getEmployees(tenantId);
    }
    getResearchers() {
        return this.promotionsService.getResearchers();
    }
    getResidents(tenantId) {
        return this.promotionsService.getResidents(tenantId);
    }
};
exports.PromotionsController = PromotionsController;
__decorate([
    (0, common_1.Get)('person/:strongId/labels'),
    __param(0, (0, common_1.Param)('strongId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PromotionsController.prototype, "getLabels", null);
__decorate([
    (0, common_1.Post)('person/:strongId/student'),
    __param(0, (0, common_1.Param)('strongId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PromotionsController.prototype, "promoteToStudent", null);
__decorate([
    (0, common_1.Post)('person/:strongId/employee'),
    __param(0, (0, common_1.Param)('strongId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PromotionsController.prototype, "promoteToEmployee", null);
__decorate([
    (0, common_1.Post)('person/:strongId/resident'),
    __param(0, (0, common_1.Param)('strongId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PromotionsController.prototype, "promoteToResident", null);
__decorate([
    (0, common_1.Post)('person/:strongId/researcher'),
    __param(0, (0, common_1.Param)('strongId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PromotionsController.prototype, "promoteToResearcher", null);
__decorate([
    (0, common_1.Get)('students/:tenantId'),
    __param(0, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PromotionsController.prototype, "getStudents", null);
__decorate([
    (0, common_1.Get)('employees/:tenantId'),
    __param(0, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PromotionsController.prototype, "getEmployees", null);
__decorate([
    (0, common_1.Get)('researchers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PromotionsController.prototype, "getResearchers", null);
__decorate([
    (0, common_1.Get)('residents/:tenantId'),
    __param(0, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PromotionsController.prototype, "getResidents", null);
exports.PromotionsController = PromotionsController = __decorate([
    (0, common_1.Controller)('promotions'),
    __metadata("design:paramtypes", [promotions_service_1.PromotionsService])
], PromotionsController);
//# sourceMappingURL=promotions.controller.js.map
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
exports.QueryController = void 0;
const common_1 = require("@nestjs/common");
const query_service_1 = require("./query.service");
let QueryController = class QueryController {
    constructor(queryService) {
        this.queryService = queryService;
    }
    enrolledInOrg(orgId, tenantId) {
        return this.queryService.getPersonsEnrolledInOrg(orgId, tenantId);
    }
    worksAtOrg(orgId, tenantId) {
        return this.queryService.getPersonsWorkingAtOrg(orgId, tenantId);
    }
    livesInLocation(locationId, tenantId) {
        return this.queryService.getPersonsLivingInLocation(locationId, tenantId);
    }
    registeredAtLocation(locationId, tenantId) {
        return this.queryService.getPersonsRegisteredAtLocation(locationId, tenantId);
    }
    enrolledAndWorking(orgA, tenantA, orgB, tenantB) {
        return this.queryService.getPersonsEnrolledAndWorking(orgA, tenantA, orgB, tenantB);
    }
    multipleEmployers(tenantA, tenantB) {
        return this.queryService.getPersonsWithMultipleEmployers(tenantA, tenantB);
    }
    withSkill(skillId) {
        return this.queryService.getPersonsWithSkill(skillId);
    }
    tenantsForPerson(strongId) {
        return this.queryService.getTenantsForPerson(strongId);
    }
    orgChart(orgId, tenantId) {
        return this.queryService.getOrgChart(orgId, tenantId);
    }
    courseRegistrations(courseId, tenantId) {
        return this.queryService.getCourseRegistrations(courseId, tenantId);
    }
    personsByLabel(label, tenantId) {
        return this.queryService.getPersonsByLabel(label, tenantId);
    }
};
exports.QueryController = QueryController;
__decorate([
    (0, common_1.Get)('enrolled-in/:orgId/:tenantId'),
    __param(0, (0, common_1.Param)('orgId')),
    __param(1, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], QueryController.prototype, "enrolledInOrg", null);
__decorate([
    (0, common_1.Get)('works-at/:orgId/:tenantId'),
    __param(0, (0, common_1.Param)('orgId')),
    __param(1, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], QueryController.prototype, "worksAtOrg", null);
__decorate([
    (0, common_1.Get)('lives-in/:locationId'),
    __param(0, (0, common_1.Param)('locationId')),
    __param(1, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], QueryController.prototype, "livesInLocation", null);
__decorate([
    (0, common_1.Get)('registered-at/:locationId/:tenantId'),
    __param(0, (0, common_1.Param)('locationId')),
    __param(1, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], QueryController.prototype, "registeredAtLocation", null);
__decorate([
    (0, common_1.Get)('cross/enrolled-and-working'),
    __param(0, (0, common_1.Query)('orgA')),
    __param(1, (0, common_1.Query)('tenantA')),
    __param(2, (0, common_1.Query)('orgB')),
    __param(3, (0, common_1.Query)('tenantB')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], QueryController.prototype, "enrolledAndWorking", null);
__decorate([
    (0, common_1.Get)('cross/multiple-employers'),
    __param(0, (0, common_1.Query)('tenantA')),
    __param(1, (0, common_1.Query)('tenantB')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], QueryController.prototype, "multipleEmployers", null);
__decorate([
    (0, common_1.Get)('skill/:skillId'),
    __param(0, (0, common_1.Param)('skillId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QueryController.prototype, "withSkill", null);
__decorate([
    (0, common_1.Get)('tenants-for-person/:strongId'),
    __param(0, (0, common_1.Param)('strongId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QueryController.prototype, "tenantsForPerson", null);
__decorate([
    (0, common_1.Get)('org-chart/:orgId/:tenantId'),
    __param(0, (0, common_1.Param)('orgId')),
    __param(1, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], QueryController.prototype, "orgChart", null);
__decorate([
    (0, common_1.Get)('course-registrations/:courseId/:tenantId'),
    __param(0, (0, common_1.Param)('courseId')),
    __param(1, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], QueryController.prototype, "courseRegistrations", null);
__decorate([
    (0, common_1.Get)('label/:label'),
    __param(0, (0, common_1.Param)('label')),
    __param(1, (0, common_1.Query)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], QueryController.prototype, "personsByLabel", null);
exports.QueryController = QueryController = __decorate([
    (0, common_1.Controller)('query'),
    __metadata("design:paramtypes", [query_service_1.QueryService])
], QueryController);
//# sourceMappingURL=query.controller.js.map
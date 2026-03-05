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
exports.RelationshipsController = void 0;
const common_1 = require("@nestjs/common");
const relationships_service_1 = require("./relationships.service");
let RelationshipsController = class RelationshipsController {
    constructor(relationshipsService) {
        this.relationshipsService = relationshipsService;
    }
    getPersonRelationships(strongId) {
        return this.relationshipsService.getPersonRelationships(strongId);
    }
    getPersonRelationshipsByTenant(strongId, tenantId) {
        return this.relationshipsService.getPersonRelationships(strongId, tenantId);
    }
    createEnrolledIn(dto) {
        return this.relationshipsService.createEnrolledIn(dto);
    }
    createWorksAt(dto) {
        return this.relationshipsService.createWorksAt(dto);
    }
    createLivesIn(dto) {
        return this.relationshipsService.createLivesIn(dto);
    }
    createHasSkill(dto) {
        return this.relationshipsService.createHasSkill(dto);
    }
    createCompleted(dto) {
        return this.relationshipsService.createCompleted(dto);
    }
    createProvidedBy(dto) {
        return this.relationshipsService.createProvidedBy(dto);
    }
    createRequiresSkill(dto) {
        return this.relationshipsService.createRequiresSkill(dto);
    }
    createHasAdvisor(dto) {
        return this.relationshipsService.createHasAdvisor(dto);
    }
    createRegisteredFor(dto) {
        return this.relationshipsService.createRegisteredFor(dto);
    }
    createReportsTo(dto) {
        return this.relationshipsService.createReportsTo(dto);
    }
    createWorksIn(dto) {
        return this.relationshipsService.createWorksIn(dto);
    }
    createRegisteredAt(dto) {
        return this.relationshipsService.createRegisteredAt(dto);
    }
    createAffiliatedWith(dto) {
        return this.relationshipsService.createAffiliatedWith(dto);
    }
    createOfferedBy(dto) {
        return this.relationshipsService.createOfferedBy(dto);
    }
    createBelongsTo(dto) {
        return this.relationshipsService.createBelongsTo(dto);
    }
    deleteEnrolledIn(personId, orgId, tenantId) {
        return this.relationshipsService.deleteEnrolledIn(personId, orgId, tenantId);
    }
    deleteWorksAt(personId, orgId, tenantId) {
        return this.relationshipsService.deleteWorksAt(personId, orgId, tenantId);
    }
    deleteLivesIn(personId, locationId, tenantId) {
        return this.relationshipsService.deleteLivesIn(personId, locationId, tenantId);
    }
    deleteHasSkill(personId, skillId, tenantId) {
        return this.relationshipsService.deleteHasSkill(personId, skillId, tenantId);
    }
};
exports.RelationshipsController = RelationshipsController;
__decorate([
    (0, common_1.Get)('person/:strongId'),
    __param(0, (0, common_1.Param)('strongId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RelationshipsController.prototype, "getPersonRelationships", null);
__decorate([
    (0, common_1.Get)('person/:strongId/tenant/:tenantId'),
    __param(0, (0, common_1.Param)('strongId')),
    __param(1, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], RelationshipsController.prototype, "getPersonRelationshipsByTenant", null);
__decorate([
    (0, common_1.Post)('enrolled-in'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RelationshipsController.prototype, "createEnrolledIn", null);
__decorate([
    (0, common_1.Post)('works-at'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RelationshipsController.prototype, "createWorksAt", null);
__decorate([
    (0, common_1.Post)('lives-in'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RelationshipsController.prototype, "createLivesIn", null);
__decorate([
    (0, common_1.Post)('has-skill'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RelationshipsController.prototype, "createHasSkill", null);
__decorate([
    (0, common_1.Post)('completed'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RelationshipsController.prototype, "createCompleted", null);
__decorate([
    (0, common_1.Post)('provided-by'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RelationshipsController.prototype, "createProvidedBy", null);
__decorate([
    (0, common_1.Post)('requires-skill'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RelationshipsController.prototype, "createRequiresSkill", null);
__decorate([
    (0, common_1.Post)('has-advisor'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RelationshipsController.prototype, "createHasAdvisor", null);
__decorate([
    (0, common_1.Post)('registered-for'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RelationshipsController.prototype, "createRegisteredFor", null);
__decorate([
    (0, common_1.Post)('reports-to'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RelationshipsController.prototype, "createReportsTo", null);
__decorate([
    (0, common_1.Post)('works-in'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RelationshipsController.prototype, "createWorksIn", null);
__decorate([
    (0, common_1.Post)('registered-at'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RelationshipsController.prototype, "createRegisteredAt", null);
__decorate([
    (0, common_1.Post)('affiliated-with'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RelationshipsController.prototype, "createAffiliatedWith", null);
__decorate([
    (0, common_1.Post)('offered-by'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RelationshipsController.prototype, "createOfferedBy", null);
__decorate([
    (0, common_1.Post)('belongs-to'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RelationshipsController.prototype, "createBelongsTo", null);
__decorate([
    (0, common_1.Delete)('enrolled-in/:personId/:orgId/:tenantId'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('personId')),
    __param(1, (0, common_1.Param)('orgId')),
    __param(2, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], RelationshipsController.prototype, "deleteEnrolledIn", null);
__decorate([
    (0, common_1.Delete)('works-at/:personId/:orgId/:tenantId'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('personId')),
    __param(1, (0, common_1.Param)('orgId')),
    __param(2, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], RelationshipsController.prototype, "deleteWorksAt", null);
__decorate([
    (0, common_1.Delete)('lives-in/:personId/:locationId/:tenantId'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('personId')),
    __param(1, (0, common_1.Param)('locationId')),
    __param(2, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], RelationshipsController.prototype, "deleteLivesIn", null);
__decorate([
    (0, common_1.Delete)('has-skill/:personId/:skillId/:tenantId'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('personId')),
    __param(1, (0, common_1.Param)('skillId')),
    __param(2, (0, common_1.Param)('tenantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], RelationshipsController.prototype, "deleteHasSkill", null);
exports.RelationshipsController = RelationshipsController = __decorate([
    (0, common_1.Controller)('relationships'),
    __metadata("design:paramtypes", [relationships_service_1.RelationshipsService])
], RelationshipsController);
//# sourceMappingURL=relationships.controller.js.map
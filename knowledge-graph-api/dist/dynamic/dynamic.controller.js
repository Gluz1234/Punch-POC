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
exports.DynamicController = void 0;
const common_1 = require("@nestjs/common");
const dynamic_service_1 = require("./dynamic.service");
let DynamicController = class DynamicController {
    constructor(dynamicService) {
        this.dynamicService = dynamicService;
    }
    createNode(dto) {
        return this.dynamicService.upsertNode(dto);
    }
    findByLabel(label, limit) {
        return this.dynamicService.findByLabel(label, limit ? parseInt(limit, 10) : 100);
    }
    findOne(label, idField, id) {
        return this.dynamicService.findOne(label, idField, id);
    }
    updateNode(label, idField, id, properties) {
        return this.dynamicService.updateNode(label, idField, id, properties ?? {});
    }
    deleteNode(label, idField, id) {
        return this.dynamicService.deleteNode(label, idField, id);
    }
    addLabel(label, idField, id, newLabel) {
        return this.dynamicService.addLabel(label, idField, id, newLabel);
    }
    createRelationship(dto) {
        return this.dynamicService.createRelationship(dto);
    }
    getRelationships(label, idField, id, direction) {
        return this.dynamicService.getRelationships(label, idField, id, direction ?? 'both');
    }
    deleteRelationship(dto) {
        return this.dynamicService.deleteRelationship(dto);
    }
};
exports.DynamicController = DynamicController;
__decorate([
    (0, common_1.Post)('nodes'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DynamicController.prototype, "createNode", null);
__decorate([
    (0, common_1.Get)('nodes/:label'),
    __param(0, (0, common_1.Param)('label')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DynamicController.prototype, "findByLabel", null);
__decorate([
    (0, common_1.Get)('nodes/:label/:idField/:id'),
    __param(0, (0, common_1.Param)('label')),
    __param(1, (0, common_1.Param)('idField')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], DynamicController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)('nodes/:label/:idField/:id'),
    __param(0, (0, common_1.Param)('label')),
    __param(1, (0, common_1.Param)('idField')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)('properties')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], DynamicController.prototype, "updateNode", null);
__decorate([
    (0, common_1.Delete)('nodes/:label/:idField/:id'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('label')),
    __param(1, (0, common_1.Param)('idField')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], DynamicController.prototype, "deleteNode", null);
__decorate([
    (0, common_1.Post)('nodes/:label/:idField/:id/labels'),
    __param(0, (0, common_1.Param)('label')),
    __param(1, (0, common_1.Param)('idField')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)('newLabel')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], DynamicController.prototype, "addLabel", null);
__decorate([
    (0, common_1.Post)('relationships'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DynamicController.prototype, "createRelationship", null);
__decorate([
    (0, common_1.Get)('relationships/:label/:idField/:id'),
    __param(0, (0, common_1.Param)('label')),
    __param(1, (0, common_1.Param)('idField')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Query)('direction')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], DynamicController.prototype, "getRelationships", null);
__decorate([
    (0, common_1.Delete)('relationships'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DynamicController.prototype, "deleteRelationship", null);
exports.DynamicController = DynamicController = __decorate([
    (0, common_1.Controller)('dynamic'),
    __metadata("design:paramtypes", [dynamic_service_1.DynamicService])
], DynamicController);
//# sourceMappingURL=dynamic.controller.js.map
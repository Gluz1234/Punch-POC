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
exports.SchemaController = void 0;
const common_1 = require("@nestjs/common");
const schema_service_1 = require("./schema.service");
let SchemaController = class SchemaController {
    constructor(schemaService) {
        this.schemaService = schemaService;
    }
    getFullSchema() {
        return this.schemaService.getFullSchema();
    }
    getLabels() {
        return this.schemaService.getLabels();
    }
    getLabelProperties(label) {
        return this.schemaService.getPropertiesForLabel(label);
    }
    getRelationshipTypes() {
        return this.schemaService.getRelationshipTypes();
    }
    getRelTypeProperties(type) {
        return this.schemaService.getPropertiesForRelType(type);
    }
    getConstraints() {
        return this.schemaService.getConstraints();
    }
    getIndexes() {
        return this.schemaService.getIndexes();
    }
    getCounts() {
        return this.schemaService.getCounts();
    }
    getTenants() {
        return this.schemaService.getTenants();
    }
};
exports.SchemaController = SchemaController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SchemaController.prototype, "getFullSchema", null);
__decorate([
    (0, common_1.Get)('labels'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SchemaController.prototype, "getLabels", null);
__decorate([
    (0, common_1.Get)('labels/:label/properties'),
    __param(0, (0, common_1.Param)('label')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SchemaController.prototype, "getLabelProperties", null);
__decorate([
    (0, common_1.Get)('relationship-types'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SchemaController.prototype, "getRelationshipTypes", null);
__decorate([
    (0, common_1.Get)('relationship-types/:type/properties'),
    __param(0, (0, common_1.Param)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SchemaController.prototype, "getRelTypeProperties", null);
__decorate([
    (0, common_1.Get)('constraints'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SchemaController.prototype, "getConstraints", null);
__decorate([
    (0, common_1.Get)('indexes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SchemaController.prototype, "getIndexes", null);
__decorate([
    (0, common_1.Get)('counts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SchemaController.prototype, "getCounts", null);
__decorate([
    (0, common_1.Get)('tenants'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SchemaController.prototype, "getTenants", null);
exports.SchemaController = SchemaController = __decorate([
    (0, common_1.Controller)('schema'),
    __metadata("design:paramtypes", [schema_service_1.SchemaService])
], SchemaController);
//# sourceMappingURL=schema.controller.js.map
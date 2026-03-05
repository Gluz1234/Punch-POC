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
exports.createGenericEntityController = createGenericEntityController;
const common_1 = require("@nestjs/common");
const generic_entity_service_1 = require("../shared/generic-entity.service");
function createGenericEntityController(config) {
    let GenericEntityController = class GenericEntityController {
        constructor(service) {
            this.service = service;
        }
        create(dto) {
            return this.service.upsert(config, dto);
        }
        findAll(limit) {
            return this.service.findAll(config, limit ? parseInt(limit, 10) : 1000);
        }
        findOne(id) {
            return this.service.findOne(config, id);
        }
        update(id, dto) {
            return this.service.update(config, id, dto);
        }
        remove(id) {
            return this.service.remove(config, id);
        }
        findByProperty(property, value, limit) {
            const specialQuery = config.specialQueries?.find(q => q.name === property);
            if (!specialQuery) {
                throw new Error(`Unknown filter: ${property}. Available filters: ${config.specialQueries?.map(q => q.name).join(', ') || 'none'}`);
            }
            return this.service.findBy(config, specialQuery.cypherParam, value, limit ? parseInt(limit, 10) : 1000);
        }
    };
    __decorate([
        (0, common_1.Post)(),
        __param(0, (0, common_1.Body)()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object]),
        __metadata("design:returntype", void 0)
    ], GenericEntityController.prototype, "create", null);
    __decorate([
        (0, common_1.Get)(),
        __param(0, (0, common_1.Query)('limit')),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String]),
        __metadata("design:returntype", void 0)
    ], GenericEntityController.prototype, "findAll", null);
    __decorate([
        (0, common_1.Get)(':id'),
        __param(0, (0, common_1.Param)('id')),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String]),
        __metadata("design:returntype", void 0)
    ], GenericEntityController.prototype, "findOne", null);
    __decorate([
        (0, common_1.Put)(':id'),
        __param(0, (0, common_1.Param)('id')),
        __param(1, (0, common_1.Body)()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, Object]),
        __metadata("design:returntype", void 0)
    ], GenericEntityController.prototype, "update", null);
    __decorate([
        (0, common_1.Delete)(':id'),
        (0, common_1.HttpCode)(200),
        __param(0, (0, common_1.Param)('id')),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String]),
        __metadata("design:returntype", void 0)
    ], GenericEntityController.prototype, "remove", null);
    __decorate([
        (0, common_1.Get)('by-:property/:value'),
        __param(0, (0, common_1.Param)('property')),
        __param(1, (0, common_1.Param)('value')),
        __param(2, (0, common_1.Query)('limit')),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, String, String]),
        __metadata("design:returntype", void 0)
    ], GenericEntityController.prototype, "findByProperty", null);
    GenericEntityController = __decorate([
        (0, common_1.Controller)(config.route),
        __metadata("design:paramtypes", [generic_entity_service_1.GenericEntityService])
    ], GenericEntityController);
    Object.defineProperty(GenericEntityController, 'name', {
        value: `${config.label}Controller`,
    });
    return GenericEntityController;
}
//# sourceMappingURL=generic-entity.controller.js.map
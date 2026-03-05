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
exports.FullTextSearchController = void 0;
const common_1 = require("@nestjs/common");
const full_text_search_service_1 = require("./full-text-search.service");
let FullTextSearchController = class FullTextSearchController {
    constructor(searchService) {
        this.searchService = searchService;
    }
    async searchPersons(query, tenantId, limit) {
        if (!query) {
            throw new common_1.BadRequestException('Search query (q) is required');
        }
        const limitNum = limit ? Math.floor(parseInt(limit, 10)) : 50;
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
            throw new common_1.BadRequestException('Limit must be a number between 1 and 1000');
        }
        return this.searchService.searchPersons(query, tenantId, limitNum);
    }
    async searchOrganizations(query, limit) {
        if (!query) {
            throw new common_1.BadRequestException('Search query (q) is required');
        }
        const limitNum = limit ? Math.floor(parseInt(limit, 10)) : 50;
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
            throw new common_1.BadRequestException('Limit must be a number between 1 and 1000');
        }
        return this.searchService.searchOrganizations(query, limitNum);
    }
    async searchSkills(query, limit) {
        if (!query) {
            throw new common_1.BadRequestException('Search query (q) is required');
        }
        const limitNum = limit ? Math.floor(parseInt(limit, 10)) : 50;
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
            throw new common_1.BadRequestException('Limit must be a number between 1 and 1000');
        }
        return this.searchService.searchSkills(query, limitNum);
    }
    async searchCourses(query, limit) {
        if (!query) {
            throw new common_1.BadRequestException('Search query (q) is required');
        }
        const limitNum = limit ? Math.floor(parseInt(limit, 10)) : 50;
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
            throw new common_1.BadRequestException('Limit must be a number between 1 and 1000');
        }
        return this.searchService.searchCourses(query, limitNum);
    }
    async advancedSearch(entity, query, limit) {
        if (!entity) {
            throw new common_1.BadRequestException('Entity type (entity) is required');
        }
        if (!query) {
            throw new common_1.BadRequestException('Search query (q) is required');
        }
        const limitNum = limit ? Math.floor(parseInt(limit, 10)) : 50;
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
            throw new common_1.BadRequestException('Limit must be a number between 1 and 1000');
        }
        return this.searchService.advancedSearch(entity, query, limitNum);
    }
    async initializeIndexes() {
        await this.searchService.initializeIndexes();
        return {
            status: 'success',
            message: 'Full-text indexes initialized for all entities'
        };
    }
};
exports.FullTextSearchController = FullTextSearchController;
__decorate([
    (0, common_1.Get)('persons'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('tenantId')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], FullTextSearchController.prototype, "searchPersons", null);
__decorate([
    (0, common_1.Get)('organizations'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FullTextSearchController.prototype, "searchOrganizations", null);
__decorate([
    (0, common_1.Get)('skills'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FullTextSearchController.prototype, "searchSkills", null);
__decorate([
    (0, common_1.Get)('courses'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FullTextSearchController.prototype, "searchCourses", null);
__decorate([
    (0, common_1.Get)('advanced'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Query)('entity')),
    __param(1, (0, common_1.Query)('q')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], FullTextSearchController.prototype, "advancedSearch", null);
__decorate([
    (0, common_1.Post)('init-indexes'),
    (0, common_1.HttpCode)(200),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FullTextSearchController.prototype, "initializeIndexes", null);
exports.FullTextSearchController = FullTextSearchController = __decorate([
    (0, common_1.Controller)('search'),
    __metadata("design:paramtypes", [full_text_search_service_1.FullTextSearchService])
], FullTextSearchController);
//# sourceMappingURL=full-text-search.controller.js.map
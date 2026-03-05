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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationsService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../neo4j/neo4j.service");
let LocationsService = class LocationsService {
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async upsert(dto) {
        const records = await this.neo4j.runQuery(`
      MERGE (l:Location {location_id: $locationId})
      ON CREATE SET
        l.name          = $name,
        l.location_type = $locType,
        l.latitude      = $lat,
        l.longitude     = $lon,
        l.postal_code   = $postalCode,
        l.population    = $population
      ON MATCH SET
        l.name          = $name,
        l.location_type = $locType,
        l.latitude      = $lat,
        l.longitude     = $lon,
        l.postal_code   = $postalCode,
        l.population    = $population
      RETURN l`, {
            locationId: dto.locationId,
            name: dto.name,
            locType: dto.locationType ?? null,
            lat: dto.latitude ?? null,
            lon: dto.longitude ?? null,
            postalCode: dto.postalCode ?? null,
            population: dto.population ?? null,
        });
        return this.neo4j.toPlainObject(records[0].get('l').properties);
    }
    async findAll() {
        const records = await this.neo4j.runQuery('MATCH (l:Location) RETURN l ORDER BY l.name');
        return records.map(r => this.neo4j.toPlainObject(r.get('l').properties));
    }
    async findOne(locationId) {
        const records = await this.neo4j.runQuery('MATCH (l:Location {location_id: $locationId}) RETURN l', { locationId });
        if (!records.length)
            throw new common_1.NotFoundException(`Location ${locationId} not found`);
        return this.neo4j.toPlainObject(records[0].get('l').properties);
    }
    async remove(locationId) {
        const records = await this.neo4j.runQuery('MATCH (l:Location {location_id: $locationId}) DETACH DELETE l RETURN count(l) AS deleted', { locationId });
        if (!records[0].get('deleted').toNumber())
            throw new common_1.NotFoundException(`Location ${locationId} not found`);
        return { deleted: true, locationId };
    }
};
exports.LocationsService = LocationsService;
exports.LocationsService = LocationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], LocationsService);
//# sourceMappingURL=locations.service.js.map
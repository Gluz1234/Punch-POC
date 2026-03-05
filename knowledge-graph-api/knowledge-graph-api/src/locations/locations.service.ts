import { Injectable, NotFoundException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class LocationsService {
  constructor(private readonly neo4j: Neo4jService) {}

  async upsert(dto: any) {
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
      locationId:  dto.locationId,
      name:        dto.name,
      locType:     dto.locationType  ?? null,
      lat:         dto.latitude      ?? null,
      lon:         dto.longitude     ?? null,
      postalCode:  dto.postalCode    ?? null,
      population:  dto.population    ?? null,
    });
    return this.neo4j.toPlainObject(records[0].get('l').properties);
  }

  async findAll() {
    const records = await this.neo4j.runQuery(
      'MATCH (l:Location) RETURN l ORDER BY l.name',
    );
    return records.map(r => this.neo4j.toPlainObject(r.get('l').properties));
  }

  async findOne(locationId: string) {
    const records = await this.neo4j.runQuery(
      'MATCH (l:Location {location_id: $locationId}) RETURN l',
      { locationId },
    );
    if (!records.length) throw new NotFoundException(`Location ${locationId} not found`);
    return this.neo4j.toPlainObject(records[0].get('l').properties);
  }

  async remove(locationId: string) {
    const records = await this.neo4j.runQuery(
      'MATCH (l:Location {location_id: $locationId}) DETACH DELETE l RETURN count(l) AS deleted',
      { locationId },
    );
    if (!records[0].get('deleted').toNumber())
      throw new NotFoundException(`Location ${locationId} not found`);
    return { deleted: true, locationId };
  }
}

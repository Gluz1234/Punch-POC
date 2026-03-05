import { Injectable, NotFoundException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly neo4j: Neo4jService) {}

  async upsert(dto: any) {
    const records = await this.neo4j.runQuery(`
      MERGE (o:Organization {org_id: $orgId})
      ON CREATE SET
        o.name                = $name,
        o.organization_type   = $orgType,
        o.industry            = $industry,
        o.registration_number = $regNum,
        o.website             = $website,
        o.phone               = $phone
      ON MATCH SET
        o.name                = $name,
        o.organization_type   = $orgType,
        o.industry            = $industry,
        o.registration_number = $regNum,
        o.website             = $website,
        o.phone               = $phone
      RETURN o`, {
      orgId:   dto.orgId,
      name:    dto.name,
      orgType: dto.organizationType ?? null,
      industry: dto.industry        ?? null,
      regNum:   dto.registrationNumber ?? null,
      website:  dto.website         ?? null,
      phone:    dto.phone           ?? null,
    });
    return this.neo4j.toPlainObject(records[0].get('o').properties);
  }

  async findAll() {
    const records = await this.neo4j.runQuery(
      'MATCH (o:Organization) RETURN o ORDER BY o.name',
    );
    return records.map(r => this.neo4j.toPlainObject(r.get('o').properties));
  }

  async findOne(orgId: string) {
    const records = await this.neo4j.runQuery(
      'MATCH (o:Organization {org_id: $orgId}) RETURN o',
      { orgId },
    );
    if (!records.length) throw new NotFoundException(`Organization ${orgId} not found`);
    return this.neo4j.toPlainObject(records[0].get('o').properties);
  }

  async remove(orgId: string) {
    const records = await this.neo4j.runQuery(
      'MATCH (o:Organization {org_id: $orgId}) DETACH DELETE o RETURN count(o) AS deleted',
      { orgId },
    );
    if (!records[0].get('deleted').toNumber())
      throw new NotFoundException(`Organization ${orgId} not found`);
    return { deleted: true, orgId };
  }
}

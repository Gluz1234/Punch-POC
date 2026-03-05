import { Injectable, NotFoundException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class PersonsService {
  constructor(private readonly neo4j: Neo4jService) {}

  async upsert(dto: any) {
    const records = await this.neo4j.runQuery(`
      MERGE (p:Person {strong_id: $strongId})
      ON CREATE SET
        p.first_name  = $firstName,  p.last_name   = $lastName,
        p.email       = $email,      p.phone       = $phone,
        p.nationality = $nationality, p.status      = $status,
        p.birth_date  = $birthDate
      ON MATCH SET
        p.first_name  = $firstName,  p.last_name   = $lastName,
        p.email       = $email,      p.phone       = $phone,
        p.nationality = $nationality, p.status      = $status,
        p.birth_date  = $birthDate
      RETURN p`, {
      strongId:    dto.strongId,
      firstName:   dto.firstName,
      lastName:    dto.lastName,
      email:       dto.email       ?? null,
      phone:       dto.phone       ?? null,
      nationality: dto.nationality ?? null,
      status:      dto.status      ?? null,
      birthDate:   dto.birthDate   ?? null,
    });
    return this.neo4j.toPlainObject(records[0].get('p').properties);
  }

  async findAll() {
    const records = await this.neo4j.runQuery(
      'MATCH (p:Person) RETURN p, labels(p) AS labels ORDER BY p.last_name',
    );
    return records.map(r => ({
      ...this.neo4j.toPlainObject(r.get('p').properties),
      labels: r.get('labels'),
    }));
  }

  async findOne(strongId: string) {
    const records = await this.neo4j.runQuery(
      'MATCH (p:Person {strong_id: $strongId}) RETURN p, labels(p) AS labels',
      { strongId },
    );
    if (!records.length) throw new NotFoundException(`Person ${strongId} not found`);
    return {
      ...this.neo4j.toPlainObject(records[0].get('p').properties),
      labels: records[0].get('labels'),
    };
  }

  async remove(strongId: string) {
    const records = await this.neo4j.runQuery(
      'MATCH (p:Person {strong_id: $strongId}) DETACH DELETE p RETURN count(p) AS deleted',
      { strongId },
    );
    if (!records[0].get('deleted').toNumber())
      throw new NotFoundException(`Person ${strongId} not found`);
    return { deleted: true, strongId };
  }
}

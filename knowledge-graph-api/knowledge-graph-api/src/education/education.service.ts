import { Injectable, NotFoundException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class EducationService {
  constructor(private readonly neo4j: Neo4jService) {}

  async upsert(dto: any) {
    const records = await this.neo4j.runQuery(`
      MERGE (e:Education {education_id: $educationId})
      ON CREATE SET
        e.title          = $title,
        e.education_type = $eduType,
        e.field_of_study = $field,
        e.start_date     = $startDate,
        e.end_date       = $endDate,
        e.grade          = $grade
      ON MATCH SET
        e.title          = $title,
        e.education_type = $eduType,
        e.field_of_study = $field,
        e.start_date     = $startDate,
        e.end_date       = $endDate,
        e.grade          = $grade
      RETURN e`, {
      educationId: dto.educationId,
      title:       dto.title,
      eduType:     dto.educationType  ?? null,
      field:       dto.fieldOfStudy   ?? null,
      startDate:   dto.startDate      ?? null,
      endDate:     dto.endDate        ?? null,
      grade:       dto.grade          ?? null,
    });
    return this.neo4j.toPlainObject(records[0].get('e').properties);
  }

  async findAll() {
    const records = await this.neo4j.runQuery(
      'MATCH (e:Education) RETURN e ORDER BY e.title',
    );
    return records.map(r => this.neo4j.toPlainObject(r.get('e').properties));
  }

  async findOne(educationId: string) {
    const records = await this.neo4j.runQuery(
      'MATCH (e:Education {education_id: $educationId}) RETURN e',
      { educationId },
    );
    if (!records.length) throw new NotFoundException(`Education ${educationId} not found`);
    return this.neo4j.toPlainObject(records[0].get('e').properties);
  }

  async remove(educationId: string) {
    const records = await this.neo4j.runQuery(
      'MATCH (e:Education {education_id: $educationId}) DETACH DELETE e RETURN count(e) AS deleted',
      { educationId },
    );
    if (!records[0].get('deleted').toNumber())
      throw new NotFoundException(`Education ${educationId} not found`);
    return { deleted: true, educationId };
  }
}

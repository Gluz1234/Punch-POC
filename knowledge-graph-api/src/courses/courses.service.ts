import { Injectable, NotFoundException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class CoursesService {
  constructor(private readonly neo4j: Neo4jService) {}

  async upsert(dto: any) {
    const records = await this.neo4j.runQuery(`
      MERGE (c:Course {course_id: $courseId})
      ON CREATE SET
        c.name          = $name,
        c.org_id        = $orgId,
        c.code          = $code,
        c.description   = $description,
        c.credits       = $credits,
        c.level         = $level,
        c.academic_term = $term
      ON MATCH SET
        c.name          = $name,
        c.code          = $code,
        c.description   = $description,
        c.credits       = $credits,
        c.level         = $level,
        c.academic_term = $term
      RETURN c`, {
      courseId:    dto.courseId,
      name:        dto.name,
      orgId:       dto.orgId        ?? null,
      code:        dto.code         ?? null,
      description: dto.description  ?? null,
      credits:     dto.credits      ?? null,
      level:       dto.level        ?? null,
      term:        dto.academicTerm ?? null,
    });
    return this.neo4j.toPlainObject(records[0].get('c').properties);
  }

  async findAll() {
    const records = await this.neo4j.runQuery(
      'MATCH (c:Course) RETURN c ORDER BY c.name',
    );
    return records.map(r => this.neo4j.toPlainObject(r.get('c').properties));
  }

  async findByOrg(orgId: string) {
    const records = await this.neo4j.runQuery(
      'MATCH (c:Course {org_id: $orgId}) RETURN c ORDER BY c.name',
      { orgId },
    );
    return records.map(r => this.neo4j.toPlainObject(r.get('c').properties));
  }

  async findOne(courseId: string) {
    const records = await this.neo4j.runQuery(
      'MATCH (c:Course {course_id: $courseId}) RETURN c',
      { courseId },
    );
    if (!records.length) throw new NotFoundException(`Course ${courseId} not found`);
    return this.neo4j.toPlainObject(records[0].get('c').properties);
  }

  async remove(courseId: string) {
    const records = await this.neo4j.runQuery(
      'MATCH (c:Course {course_id: $courseId}) DETACH DELETE c RETURN count(c) AS deleted',
      { courseId },
    );
    if (!records[0].get('deleted').toNumber())
      throw new NotFoundException(`Course ${courseId} not found`);
    return { deleted: true, courseId };
  }
}

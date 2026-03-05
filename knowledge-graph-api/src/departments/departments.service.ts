import { Injectable, NotFoundException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly neo4j: Neo4jService) {}

  async upsert(dto: any) {
    const records = await this.neo4j.runQuery(`
      MERGE (d:Department {department_id: $deptId})
      ON CREATE SET
        d.name        = $name,
        d.org_id      = $orgId,
        d.code        = $code,
        d.description = $description,
        d.head_name   = $headName
      ON MATCH SET
        d.name        = $name,
        d.code        = $code,
        d.description = $description,
        d.head_name   = $headName
      RETURN d`, {
      deptId:      dto.departmentId,
      name:        dto.name,
      orgId:       dto.orgId       ?? null,
      code:        dto.code        ?? null,
      description: dto.description ?? null,
      headName:    dto.headName    ?? null,
    });
    return this.neo4j.toPlainObject(records[0].get('d').properties);
  }

  async findAll() {
    const records = await this.neo4j.runQuery(
      'MATCH (d:Department) RETURN d ORDER BY d.name',
    );
    return records.map(r => this.neo4j.toPlainObject(r.get('d').properties));
  }

  async findByOrg(orgId: string) {
    const records = await this.neo4j.runQuery(
      'MATCH (d:Department {org_id: $orgId}) RETURN d ORDER BY d.name',
      { orgId },
    );
    return records.map(r => this.neo4j.toPlainObject(r.get('d').properties));
  }

  async findOne(departmentId: string) {
    const records = await this.neo4j.runQuery(
      'MATCH (d:Department {department_id: $departmentId}) RETURN d',
      { departmentId },
    );
    if (!records.length) throw new NotFoundException(`Department ${departmentId} not found`);
    return this.neo4j.toPlainObject(records[0].get('d').properties);
  }

  async remove(departmentId: string) {
    const records = await this.neo4j.runQuery(
      'MATCH (d:Department {department_id: $departmentId}) DETACH DELETE d RETURN count(d) AS deleted',
      { departmentId },
    );
    if (!records[0].get('deleted').toNumber())
      throw new NotFoundException(`Department ${departmentId} not found`);
    return { deleted: true, departmentId };
  }
}

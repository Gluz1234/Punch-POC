import { Injectable, NotFoundException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class SkillsService {
  constructor(private readonly neo4j: Neo4jService) {}

  async upsert(dto: any) {
    const records = await this.neo4j.runQuery(`
      MERGE (s:Skill {skill_id: $skillId})
      ON CREATE SET
        s.name        = $name,
        s.category    = $category,
        s.description = $description,
        s.level_scale = $levelScale
      ON MATCH SET
        s.name        = $name,
        s.category    = $category,
        s.description = $description,
        s.level_scale = $levelScale
      RETURN s`, {
      skillId:    dto.skillId,
      name:       dto.name,
      category:   dto.category    ?? null,
      description: dto.description ?? null,
      levelScale:  dto.levelScale  ?? null,
    });
    return this.neo4j.toPlainObject(records[0].get('s').properties);
  }

  async findAll() {
    const records = await this.neo4j.runQuery(
      'MATCH (s:Skill) RETURN s ORDER BY s.name',
    );
    return records.map(r => this.neo4j.toPlainObject(r.get('s').properties));
  }

  async findOne(skillId: string) {
    const records = await this.neo4j.runQuery(
      'MATCH (s:Skill {skill_id: $skillId}) RETURN s',
      { skillId },
    );
    if (!records.length) throw new NotFoundException(`Skill ${skillId} not found`);
    return this.neo4j.toPlainObject(records[0].get('s').properties);
  }

  async remove(skillId: string) {
    const records = await this.neo4j.runQuery(
      'MATCH (s:Skill {skill_id: $skillId}) DETACH DELETE s RETURN count(s) AS deleted',
      { skillId },
    );
    if (!records[0].get('deleted').toNumber())
      throw new NotFoundException(`Skill ${skillId} not found`);
    return { deleted: true, skillId };
  }
}

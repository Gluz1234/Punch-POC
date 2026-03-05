import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import neo4j, { Driver, Session, Integer, Node, Relationship } from 'neo4j-driver';

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private driver: Driver;
  private readonly logger = new Logger(Neo4jService.name);

  private readonly uri      = process.env.NEO4J_URI      || 'bolt://localhost:7687';
  private readonly username = process.env.NEO4J_USERNAME || 'neo4j';
  private readonly password = process.env.NEO4J_PASSWORD || 'password';

  async onModuleInit() {
    this.driver = neo4j.driver(
      this.uri,
      neo4j.auth.basic(this.username, this.password),
    );
    await this.driver.verifyConnectivity();
    this.logger.log(`Connected to Neo4j at ${this.uri}`);
    await this.applyConstraints();
  }

  async onModuleDestroy() {
    await this.driver.close();
  }

  session(): Session {
    return this.driver.session();
  }

  async runQuery(cypher: string, params: Record<string, any> = {}): Promise<any[]> {
    const session = this.session();
    try {
      const result = await session.run(cypher, params);
      return result.records;
    } finally {
      await session.close();
    }
  }

  private async applyConstraints() {
    const constraints = [
      'CREATE CONSTRAINT person_strong_id  IF NOT EXISTS FOR (p:Person)      REQUIRE p.strong_id     IS UNIQUE',
      'CREATE CONSTRAINT org_id            IF NOT EXISTS FOR (o:Organization) REQUIRE o.org_id        IS UNIQUE',
      'CREATE CONSTRAINT location_id       IF NOT EXISTS FOR (l:Location)     REQUIRE l.location_id   IS UNIQUE',
      'CREATE CONSTRAINT skill_id          IF NOT EXISTS FOR (s:Skill)        REQUIRE s.skill_id      IS UNIQUE',
      'CREATE CONSTRAINT education_id      IF NOT EXISTS FOR (e:Education)    REQUIRE e.education_id  IS UNIQUE',
      'CREATE CONSTRAINT course_id         IF NOT EXISTS FOR (c:Course)       REQUIRE c.course_id     IS UNIQUE',
      'CREATE CONSTRAINT department_id     IF NOT EXISTS FOR (d:Department)   REQUIRE d.department_id IS UNIQUE',
    ];
    for (const c of constraints) await this.runQuery(c);
    this.logger.log('Schema constraints verified');
  }

  async createConstraintForLabel(label: string, idField: string): Promise<void> {
    const name   = `constraint_${label.toLowerCase()}_${idField.toLowerCase()}`;
    const cypher = `CREATE CONSTRAINT ${name} IF NOT EXISTS FOR (n:\`${label}\`) REQUIRE n.\`${idField}\` IS UNIQUE`;
    await this.runQuery(cypher);
    this.logger.log(`Created constraint: ${name}`);
  }

  // Converts Neo4j Integer and Node/Relationship types to plain JS objects
  toPlainObject(properties: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(properties)) {
      out[k] = this.convertValue(v);
    }
    return out;
  }

  private convertValue(value: any): any {
    if (value === null || value === undefined) return value;
    if (Integer.isInteger(value)) return value.toNumber();
    if (Array.isArray(value)) return value.map(v => this.convertValue(v));
    if (typeof value === 'object') {
      const ctor = value.constructor?.name;
      if (ctor === 'Node') {
        const n = value as Node;
        return { _id: n.identity.toNumber(), labels: n.labels, ...this.toPlainObject(n.properties) };
      }
      if (ctor === 'Relationship') {
        const r = value as Relationship;
        return { _id: r.identity.toNumber(), type: r.type, ...this.toPlainObject(r.properties) };
      }
    }
    return value;
  }

  // Prevents Cypher injection via label/type/property-key names.
  // Values are always safe because they travel as parameters.
  sanitizeIdentifier(name: string): string {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
      throw new Error(
        `Invalid identifier "${name}". Only letters, numbers and underscores allowed.`,
      );
    }
    return name;
  }
}

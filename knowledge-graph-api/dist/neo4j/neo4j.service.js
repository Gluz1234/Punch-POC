"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Neo4jService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Neo4jService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_driver_1 = require("neo4j-driver");
let Neo4jService = Neo4jService_1 = class Neo4jService {
    constructor() {
        this.logger = new common_1.Logger(Neo4jService_1.name);
        this.uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
        this.username = process.env.NEO4J_USERNAME || 'neo4j';
        this.password = process.env.NEO4J_PASSWORD || 'password';
    }
    async onModuleInit() {
        this.driver = neo4j_driver_1.default.driver(this.uri, neo4j_driver_1.default.auth.basic(this.username, this.password));
        await this.driver.verifyConnectivity();
        this.logger.log(`Connected to Neo4j at ${this.uri}`);
        await this.applyConstraints();
    }
    async onModuleDestroy() {
        await this.driver.close();
    }
    session() {
        return this.driver.session();
    }
    async runQuery(cypher, params = {}) {
        const session = this.session();
        try {
            const result = await session.run(cypher, params);
            return result.records;
        }
        finally {
            await session.close();
        }
    }
    async applyConstraints() {
        const constraints = [
            'CREATE CONSTRAINT person_strong_id  IF NOT EXISTS FOR (p:Person)      REQUIRE p.strong_id     IS UNIQUE',
            'CREATE CONSTRAINT org_id            IF NOT EXISTS FOR (o:Organization) REQUIRE o.org_id        IS UNIQUE',
            'CREATE CONSTRAINT location_id       IF NOT EXISTS FOR (l:Location)     REQUIRE l.location_id   IS UNIQUE',
            'CREATE CONSTRAINT skill_id          IF NOT EXISTS FOR (s:Skill)        REQUIRE s.skill_id      IS UNIQUE',
            'CREATE CONSTRAINT education_id      IF NOT EXISTS FOR (e:Education)    REQUIRE e.education_id  IS UNIQUE',
            'CREATE CONSTRAINT course_id         IF NOT EXISTS FOR (c:Course)       REQUIRE c.course_id     IS UNIQUE',
            'CREATE CONSTRAINT department_id     IF NOT EXISTS FOR (d:Department)   REQUIRE d.department_id IS UNIQUE',
        ];
        for (const c of constraints)
            await this.runQuery(c);
        this.logger.log('Schema constraints verified');
    }
    async createConstraintForLabel(label, idField) {
        const name = `constraint_${label.toLowerCase()}_${idField.toLowerCase()}`;
        const cypher = `CREATE CONSTRAINT ${name} IF NOT EXISTS FOR (n:\`${label}\`) REQUIRE n.\`${idField}\` IS UNIQUE`;
        await this.runQuery(cypher);
        this.logger.log(`Created constraint: ${name}`);
    }
    toPlainObject(properties) {
        const out = {};
        for (const [k, v] of Object.entries(properties)) {
            out[k] = this.convertValue(v);
        }
        return out;
    }
    convertValue(value) {
        if (value === null || value === undefined)
            return value;
        if (neo4j_driver_1.Integer.isInteger(value))
            return value.toNumber();
        if (Array.isArray(value))
            return value.map(v => this.convertValue(v));
        if (typeof value === 'object') {
            const ctor = value.constructor?.name;
            if (ctor === 'Node') {
                const n = value;
                return { _id: n.identity.toNumber(), labels: n.labels, ...this.toPlainObject(n.properties) };
            }
            if (ctor === 'Relationship') {
                const r = value;
                return { _id: r.identity.toNumber(), type: r.type, ...this.toPlainObject(r.properties) };
            }
        }
        return value;
    }
    sanitizeIdentifier(name) {
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
            throw new Error(`Invalid identifier "${name}". Only letters, numbers and underscores allowed.`);
        }
        return name;
    }
};
exports.Neo4jService = Neo4jService;
exports.Neo4jService = Neo4jService = Neo4jService_1 = __decorate([
    (0, common_1.Injectable)()
], Neo4jService);
//# sourceMappingURL=neo4j.service.js.map
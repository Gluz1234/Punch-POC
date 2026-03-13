import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../infrastructure/neo4j/neo4j.service';

export interface PropertySecurityLevel {
  name: string;
  type: string;
  securityLevel: number;
}

@Injectable()
export class PropertySecurityService {
  private levelCache = new Map<string, number>();
  private cacheExpiry = 0;

  constructor(private readonly neo4j: Neo4jService) {}

  // ── Cache management ──────────────────────────────────────────────────────

  async getPropertyLevels(): Promise<Map<string, number>> {
    if (Date.now() < this.cacheExpiry) return this.levelCache;

    const records = await this.neo4j.runQuery(
      `MATCH (p:SchemaProperty) RETURN p.name AS name, coalesce(p.securityLevel, 1) AS level`,
    );

    const map = new Map<string, number>();
    for (const r of records) {
      const raw = r.get('level');
      const level = typeof raw === 'object' && raw !== null ? raw.toNumber() : Number(raw) || 1;
      map.set(r.get('name') as string, level);
    }

    this.levelCache = map;
    this.cacheExpiry = Date.now() + 60_000; // 1-minute cache
    return map;
  }

  invalidateCache() {
    this.cacheExpiry = 0;
  }

  // ── Clearance resolution ──────────────────────────────────────────────────

  /**
   * Extracts the caller's clearance level from request headers.
   * - Admin always gets level 6 (bypasses all checks).
   * - Otherwise looks for x-authz-env-{tenantId} header value.
   * - Defaults to 1 if header is absent or unparseable.
   */
  getClearanceLevel(request: any): number {
    if (request.headers['x-authz-is-admin'] === 'true') return 6;

    const tenantId: string | undefined = request.headers['x-tenant-id'];
    if (!tenantId) return 1;

    const raw = request.headers[`x-authz-env-${tenantId}`];
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) return 1;
    return Math.max(1, Math.min(6, parsed));
  }

  // ── GET enforcement: mask hidden properties ───────────────────────────────

  async maskObject(data: any, clearance: number): Promise<any> {
    if (clearance >= 6) return data; // max clearance — nothing hidden
    const levels = await this.getPropertyLevels();
    return this.maskRecursive(data, clearance, levels);
  }

  private maskRecursive(data: any, clearance: number, levels: Map<string, number>): any {
    if (Array.isArray(data)) {
      return data.map(item => this.maskRecursive(item, clearance, levels));
    }
    if (data !== null && typeof data === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        const requiredLevel = levels.get(key) ?? 1;
        if (requiredLevel > clearance) {
          result[key] = '[HIDDEN]';
        } else {
          result[key] = this.maskRecursive(value, clearance, levels);
        }
      }
      return result;
    }
    return data;
  }

  // ── Mutation enforcement: block if payload contains restricted properties ─

  /**
   * Returns the first property key in the body that exceeds clearance,
   * or null if the entire payload is permitted.
   */
  async findBlockedWriteProperty(body: any, clearance: number): Promise<string | null> {
    if (!body || typeof body !== 'object') return null;
    const levels = await this.getPropertyLevels();
    for (const key of Object.keys(body)) {
      const requiredLevel = levels.get(key) ?? 1;
      if (requiredLevel > clearance) return key;
    }
    return null;
  }

  // ── Admin API: read / write security levels ───────────────────────────────

  async getAllPropertyLevels(): Promise<PropertySecurityLevel[]> {
    const records = await this.neo4j.runQuery(
      `MATCH (p:SchemaProperty)
       RETURN p.name AS name, p.type AS type, coalesce(p.securityLevel, 1) AS securityLevel
       ORDER BY p.name`,
    );
    return records.map(r => {
      const raw = r.get('securityLevel');
      return {
        name: r.get('name') as string,
        type: r.get('type') as string,
        securityLevel: typeof raw === 'object' && raw !== null ? raw.toNumber() : Number(raw) || 1,
      };
    });
  }

  async setPropertyLevel(propertyName: string, level: number): Promise<{ updated: number }> {
    if (level < 1 || level > 6) {
      throw new Error('Security level must be between 1 and 6');
    }
    const records = await this.neo4j.runQuery(
      `MATCH (p:SchemaProperty { name: $name })
       SET p.securityLevel = $level
       RETURN count(p) AS updated`,
      { name: propertyName, level },
    );
    const updated = records[0]?.get('updated');
    const count = typeof updated === 'object' && updated !== null ? updated.toNumber() : Number(updated) || 0;
    this.invalidateCache();
    return { updated: count };
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import neo4j from 'neo4j-driver';
import { randomUUID } from 'crypto';
import { Neo4jService } from '../infrastructure/neo4j/neo4j.service';

const INTERNAL_LABELS = new Set([
  'Entity',
  'MergeEvent',
  'EntitySchema',
  'SchemaProperty',
  'PromotionSubtype',
  'PromotionField',
]);

export interface CanonicalResolutionResult {
  requestedEntityId: string;
  canonicalEntityId: string;
  wasMergedAlias: boolean;
  mergePath: string[];
}

export interface DuplicateSuggestion {
  entityId: string;
  labels: string[];
  score: number;
  reasons: string[];
  preview: {
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    code?: string;
    title?: string;
  };
}

@Injectable()
export class EntityResolutionService {
  private static readonly CANONICAL_ID_FIELD = 'entity_id';

  constructor(private readonly neo4j: Neo4jService) {}

  async resolveCanonicalEntityId(entityId: string): Promise<CanonicalResolutionResult> {
    if (typeof entityId !== 'string' || !entityId.trim()) {
      throw new BadRequestException('entityId is required');
    }

    const normalizedId = entityId.trim();
    const safeIdField = this.neo4j.sanitizeIdentifier(EntityResolutionService.CANONICAL_ID_FIELD);

    const records = await this.neo4j.runQuery(
      `
      MATCH (n:Entity {\`${safeIdField}\`: $entityId})
      CALL {
        WITH n
        OPTIONAL MATCH p=(n)-[:MERGED_INTO*1..]->(root:Entity)
        WHERE NOT (root)-[:MERGED_INTO]->()
        WITH p, root
        ORDER BY CASE WHEN p IS NULL THEN 0 ELSE length(p) END DESC
        LIMIT 1
        RETURN p AS mergePath, root
      }
      RETURN n.\`${safeIdField}\` AS requestedEntityId,
             coalesce(root.\`${safeIdField}\`, n.\`${safeIdField}\`) AS canonicalEntityId,
             root IS NOT NULL AS wasMergedAlias,
             CASE
               WHEN mergePath IS NULL THEN [n.\`${safeIdField}\`]
               ELSE [x IN nodes(mergePath) | x.\`${safeIdField}\`]
             END AS mergePath
      `,
      { entityId: normalizedId },
    );

    if (!records.length) {
      throw new NotFoundException(`Entity ${normalizedId} not found`);
    }

    return {
      requestedEntityId: records[0].get('requestedEntityId'),
      canonicalEntityId: records[0].get('canonicalEntityId'),
      wasMergedAlias: records[0].get('wasMergedAlias'),
      mergePath: records[0].get('mergePath') as string[],
    };
  }

  async resolveCanonicalEntityIdIfExists(entityId: string): Promise<string> {
    try {
      const resolved = await this.resolveCanonicalEntityId(entityId);
      return resolved.canonicalEntityId;
    } catch (err) {
      if (err instanceof NotFoundException) {
        return entityId;
      }
      throw err;
    }
  }

  async getPossibleDuplicates(entityId: string, limit = 5): Promise<DuplicateSuggestion[]> {
    const resolution = await this.resolveCanonicalEntityId(entityId);
    const canonicalId = resolution.canonicalEntityId;
    const safeIdField = this.neo4j.sanitizeIdentifier(EntityResolutionService.CANONICAL_ID_FIELD);

    const records = await this.neo4j.runQuery(
      `
      MATCH (n:Entity {\`${safeIdField}\`: $entityId})
      WITH n, [label IN labels(n) WHERE NOT label IN $internalLabels] AS entityLabels
      MATCH (candidate:Entity)
      WHERE candidate.\`${safeIdField}\` <> n.\`${safeIdField}\`
        AND NOT (candidate)-[:MERGED_INTO]->()
        AND (
          size(entityLabels) = 0
          OR any(label IN labels(candidate) WHERE label IN entityLabels)
        )
      WITH n, candidate,
           CASE
             WHEN n.email IS NOT NULL AND candidate.email IS NOT NULL
                  AND toLower(trim(n.email)) = toLower(trim(candidate.email))
             THEN 1.0 ELSE 0.0
           END AS emailScore,
           CASE
             WHEN n.phone IS NOT NULL AND candidate.phone IS NOT NULL
                  AND replace(replace(replace(replace(replace(toLower(trim(n.phone)), ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') =
                      replace(replace(replace(replace(replace(toLower(trim(candidate.phone)), ' ', ''), '-', ''), '(', ''), ')', ''), '+', '')
             THEN 0.85 ELSE 0.0
           END AS phoneScore,
           CASE
             WHEN toLower(trim(coalesce(n.first_name, '') + ' ' + coalesce(n.last_name, ''))) <> ''
                  AND toLower(trim(coalesce(n.first_name, '') + ' ' + coalesce(n.last_name, ''))) =
                      toLower(trim(coalesce(candidate.first_name, '') + ' ' + coalesce(candidate.last_name, '')))
             THEN 0.75 ELSE 0.0
           END AS personNameScore,
           CASE
             WHEN n.name IS NOT NULL AND candidate.name IS NOT NULL
                  AND toLower(trim(n.name)) = toLower(trim(candidate.name))
             THEN 0.7 ELSE 0.0
           END AS nameScore,
           CASE
             WHEN n.code IS NOT NULL AND candidate.code IS NOT NULL
                  AND toLower(trim(n.code)) = toLower(trim(candidate.code))
             THEN 0.65 ELSE 0.0
           END AS codeScore,
           CASE
             WHEN n.title IS NOT NULL AND candidate.title IS NOT NULL
                  AND toLower(trim(n.title)) = toLower(trim(candidate.title))
             THEN 0.6 ELSE 0.0
           END AS titleScore
      WITH candidate,
           (emailScore + phoneScore + personNameScore + nameScore + codeScore + titleScore) AS score,
           [reason IN [
             CASE WHEN emailScore > 0 THEN 'email' END,
             CASE WHEN phoneScore > 0 THEN 'phone' END,
             CASE WHEN personNameScore > 0 THEN 'first_name+last_name' END,
             CASE WHEN nameScore > 0 THEN 'name' END,
             CASE WHEN codeScore > 0 THEN 'code' END,
             CASE WHEN titleScore > 0 THEN 'title' END
           ] WHERE reason IS NOT NULL] AS reasons
      WHERE score >= $minScore
      RETURN candidate, labels(candidate) AS labels, score, reasons
      ORDER BY score DESC, candidate.\`${safeIdField}\`
      LIMIT $limit
      `,
      {
        entityId: canonicalId,
        internalLabels: Array.from(INTERNAL_LABELS),
        minScore: 0.6,
        limit: neo4j.int(this.normalizeLimit(limit)),
      },
    );

    return records.map((record) => this.parsePossibleDuplicateRecord(record));
  }

  async getPossibleDuplicatesForDraft(
    label: string,
    properties: Record<string, any>,
    excludeEntityId?: string,
    limit = 5,
  ): Promise<DuplicateSuggestion[]> {
    const safeLabel = this.neo4j.sanitizeIdentifier(label);
    const normalized = this.normalizeDraftInput(properties);

    if (!normalized.email && !normalized.phone && !normalized.name && !normalized.fullName && !normalized.code && !normalized.title) {
      return [];
    }

    const safeIdField = this.neo4j.sanitizeIdentifier(EntityResolutionService.CANONICAL_ID_FIELD);

    const records = await this.neo4j.runQuery(
      `
      MATCH (candidate:\`${safeLabel}\`:Entity)
      WHERE NOT (candidate)-[:MERGED_INTO]->()
        AND ($excludeEntityId = '' OR candidate.\`${safeIdField}\` <> $excludeEntityId)
      WITH candidate,
           CASE
             WHEN $email <> '' AND candidate.email IS NOT NULL
                  AND toLower(trim(candidate.email)) = $email
             THEN 1.0 ELSE 0.0
           END AS emailScore,
           CASE
             WHEN $phone <> '' AND candidate.phone IS NOT NULL
                  AND replace(replace(replace(replace(replace(toLower(trim(candidate.phone)), ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = $phone
             THEN 0.85 ELSE 0.0
           END AS phoneScore,
           CASE
             WHEN $fullName <> ''
                  AND (
                    toLower(trim(coalesce(candidate.first_name, '') + ' ' + coalesce(candidate.last_name, ''))) = $fullName
                    OR toLower(trim(coalesce(candidate.name, ''))) = $fullName
                  )
             THEN 0.75 ELSE 0.0
           END AS fullNameScore,
           CASE
             WHEN $name <> '' AND candidate.name IS NOT NULL
                  AND toLower(trim(candidate.name)) = $name
             THEN 0.7 ELSE 0.0
           END AS nameScore,
           CASE
             WHEN $code <> '' AND candidate.code IS NOT NULL
                  AND toLower(trim(candidate.code)) = $code
             THEN 0.65 ELSE 0.0
           END AS codeScore,
           CASE
             WHEN $title <> '' AND candidate.title IS NOT NULL
                  AND toLower(trim(candidate.title)) = $title
             THEN 0.6 ELSE 0.0
           END AS titleScore
      WITH candidate,
           (emailScore + phoneScore + fullNameScore + nameScore + codeScore + titleScore) AS score,
           [reason IN [
             CASE WHEN emailScore > 0 THEN 'email' END,
             CASE WHEN phoneScore > 0 THEN 'phone' END,
             CASE WHEN fullNameScore > 0 THEN 'first_name+last_name' END,
             CASE WHEN nameScore > 0 THEN 'name' END,
             CASE WHEN codeScore > 0 THEN 'code' END,
             CASE WHEN titleScore > 0 THEN 'title' END
           ] WHERE reason IS NOT NULL] AS reasons
      WHERE score >= $minScore
      RETURN candidate, labels(candidate) AS labels, score, reasons
      ORDER BY score DESC, candidate.\`${safeIdField}\`
      LIMIT $limit
      `,
      {
        excludeEntityId: (excludeEntityId ?? '').trim(),
        email: normalized.email,
        phone: normalized.phone,
        fullName: normalized.fullName,
        name: normalized.name,
        code: normalized.code,
        title: normalized.title,
        minScore: 0.6,
        limit: neo4j.int(this.normalizeLimit(limit)),
      },
    );

    return records.map((record) => this.parsePossibleDuplicateRecord(record));
  }

  async buildMutationContextForEntity(
    requestedEntityId: string,
    includeDuplicates = true,
    limit = 5,
  ) {
    const resolution = await this.resolveCanonicalEntityId(requestedEntityId);
    const possibleDuplicates = includeDuplicates
      ? await this.getPossibleDuplicates(resolution.canonicalEntityId, limit)
      : [];

    return {
      ...resolution,
      possibleDuplicates,
      duplicateCount: possibleDuplicates.length,
    };
  }

  async buildMutationContextForPair(
    sourceEntityId: string,
    targetEntityId: string,
    includeDuplicates = true,
    limit = 5,
  ) {
    const [source, target] = await Promise.all([
      this.buildMutationContextForEntity(sourceEntityId, includeDuplicates, limit),
      this.buildMutationContextForEntity(targetEntityId, includeDuplicates, limit),
    ]);

    return { source, target };
  }

  async mergeEntities(primaryEntityId: string, duplicateEntityId: string, reason?: string) {
    if (!primaryEntityId?.trim() || !duplicateEntityId?.trim()) {
      throw new BadRequestException('primaryEntityId and duplicateEntityId are required');
    }

    if (primaryEntityId.trim() === duplicateEntityId.trim()) {
      throw new BadRequestException('Cannot merge an entity into itself');
    }

    const primaryResolution = await this.resolveCanonicalEntityId(primaryEntityId);
    const duplicateResolution = await this.resolveCanonicalEntityId(duplicateEntityId);

    if (primaryResolution.canonicalEntityId === duplicateResolution.canonicalEntityId) {
      return {
        merged: false,
        alreadyCanonicalized: true,
        primaryEntityId: primaryResolution.canonicalEntityId,
        duplicateEntityId: duplicateResolution.requestedEntityId,
        canonicalEntityId: primaryResolution.canonicalEntityId,
      };
    }

    const mergeId = randomUUID();
    const now = new Date().toISOString();
    const safeIdField = this.neo4j.sanitizeIdentifier(EntityResolutionService.CANONICAL_ID_FIELD);

    const snapshotRecords = await this.neo4j.runQuery(
      `
      MATCH (primary:Entity {\`${safeIdField}\`: $primaryId})
      MATCH (duplicate:Entity {\`${safeIdField}\`: $duplicateId})
      RETURN labels(primary) AS primaryLabels,
             properties(primary) AS primaryProps,
             labels(duplicate) AS duplicateLabels,
             properties(duplicate) AS duplicateProps
      `,
      {
        primaryId: primaryResolution.canonicalEntityId,
        duplicateId: duplicateResolution.canonicalEntityId,
      },
    );

    if (!snapshotRecords.length) {
      throw new NotFoundException('Primary or duplicate entity not found');
    }

    const primarySnapshot = {
      labels: (snapshotRecords[0].get('primaryLabels') as string[]).filter((label) => !INTERNAL_LABELS.has(label)),
      properties: this.neo4j.toPlainObject(snapshotRecords[0].get('primaryProps')),
    };

    const duplicateSnapshot = {
      labels: (snapshotRecords[0].get('duplicateLabels') as string[]).filter((label) => !INTERNAL_LABELS.has(label)),
      properties: this.neo4j.toPlainObject(snapshotRecords[0].get('duplicateProps')),
    };

    await this.neo4j.runQuery(
      `
      MATCH (primary:Entity {\`${safeIdField}\`: $primaryId})
      MATCH (duplicate:Entity {\`${safeIdField}\`: $duplicateId})
      MERGE (duplicate)-[m:MERGED_INTO]->(primary)
      SET m.merge_id = $mergeId,
          m.updated_at = $now,
          m.reason = $reason,
          m.created_at = coalesce(m.created_at, $now)
      SET duplicate.is_merged = true,
          duplicate.canonical_entity_id = primary.\`${safeIdField}\`,
          duplicate.merged_at = $now
      MERGE (event:MergeEvent {merge_id: $mergeId})
      SET event.primary_entity_id = primary.\`${safeIdField}\`,
          event.duplicate_entity_id = duplicate.\`${safeIdField}\`,
          event.created_at = $now,
          event.status = 'ACTIVE',
          event.reason = $reason,
          event.primary_snapshot = $primarySnapshot,
          event.duplicate_snapshot = $duplicateSnapshot
      MERGE (event)-[:MERGE_PRIMARY]->(primary)
      MERGE (event)-[:MERGE_DUPLICATE]->(duplicate)
      `,
      {
        primaryId: primaryResolution.canonicalEntityId,
        duplicateId: duplicateResolution.canonicalEntityId,
        mergeId,
        now,
        reason: reason ?? null,
        primarySnapshot: JSON.stringify(primarySnapshot),
        duplicateSnapshot: JSON.stringify(duplicateSnapshot),
      },
    );

    const identity = await this.buildMutationContextForPair(
      primaryResolution.canonicalEntityId,
      duplicateResolution.canonicalEntityId,
      true,
    );

    return {
      merged: true,
      mergeId,
      primaryEntityId: primaryResolution.canonicalEntityId,
      duplicateEntityId: duplicateResolution.canonicalEntityId,
      reason: reason ?? null,
      _identity: identity,
    };
  }

  async unmergeEntities(mergeId: string) {
    if (!mergeId?.trim()) {
      throw new BadRequestException('mergeId is required');
    }

    const safeIdField = this.neo4j.sanitizeIdentifier(EntityResolutionService.CANONICAL_ID_FIELD);
    const now = new Date().toISOString();

    const records = await this.neo4j.runQuery(
      `
      MATCH (event:MergeEvent {merge_id: $mergeId})
      WHERE coalesce(event.status, 'ACTIVE') = 'ACTIVE'
      MATCH (duplicate:Entity {\`${safeIdField}\`: event.duplicate_entity_id})-[m:MERGED_INTO {merge_id: $mergeId}]->(primary:Entity {\`${safeIdField}\`: event.primary_entity_id})
      DELETE m
      SET event.status = 'REVERTED',
          event.reverted_at = $now
      WITH duplicate, primary
      SET duplicate.is_merged = false
      REMOVE duplicate.canonical_entity_id, duplicate.merged_at
      RETURN duplicate.\`${safeIdField}\` AS duplicateEntityId,
             primary.\`${safeIdField}\` AS primaryEntityId
      LIMIT 1
      `,
      { mergeId: mergeId.trim(), now },
    );

    if (!records.length) {
      throw new NotFoundException(`Active merge event ${mergeId} not found`);
    }

    const duplicateEntityId = records[0].get('duplicateEntityId') as string;
    const primaryEntityId = records[0].get('primaryEntityId') as string;

    const identity = await this.buildMutationContextForPair(
      primaryEntityId,
      duplicateEntityId,
      true,
    );

    return {
      unmerged: true,
      mergeId,
      primaryEntityId,
      duplicateEntityId,
      _identity: identity,
    };
  }

  private parsePossibleDuplicateRecord(record: any): DuplicateSuggestion {
    const node = record.get('candidate');
    const props = this.neo4j.toPlainObject(node.properties ?? {});
    const labels = ((record.get('labels') as string[]) ?? []).filter((label) => !INTERNAL_LABELS.has(label));

    return {
      entityId: String(props.entity_id ?? ''),
      labels,
      score: Number(record.get('score') ?? 0),
      reasons: (record.get('reasons') as string[]) ?? [],
      preview: {
        name: props.name,
        first_name: props.first_name,
        last_name: props.last_name,
        email: props.email,
        code: props.code,
        title: props.title,
      },
    };
  }

  private normalizeDraftInput(properties: Record<string, any>) {
    const source = properties ?? {};

    const firstName = this.normalizeString(source.first_name ?? source.firstName);
    const lastName = this.normalizeString(source.last_name ?? source.lastName);
    const fullName = this.normalizeString(`${firstName} ${lastName}`);

    return {
      email: this.normalizeString(source.email),
      phone: this.normalizePhone(source.phone),
      fullName,
      name: this.normalizeString(source.name),
      code: this.normalizeString(source.code),
      title: this.normalizeString(source.title),
    };
  }

  private normalizeString(value: any): string {
    if (value === undefined || value === null) {
      return '';
    }
    return String(value).trim().toLowerCase();
  }

  private normalizePhone(value: any): string {
    return this.normalizeString(value).replace(/[\s\-()+]/g, '');
  }

  private normalizeLimit(limit: number): number {
    if (!Number.isFinite(limit)) {
      throw new BadRequestException('limit must be numeric');
    }

    const normalized = Math.floor(limit);
    if (normalized <= 0) {
      throw new BadRequestException('limit must be a positive integer');
    }

    return normalized;
  }

  async getAllDuplicateGroups() {
    const safeIdField = this.neo4j.sanitizeIdentifier(EntityResolutionService.CANONICAL_ID_FIELD);

    const records = await this.neo4j.runQuery(
      `
      MATCH (duplicate:Entity)-[m:MERGED_INTO]->(primary:Entity)
      WHERE EXISTS {
        MATCH (event:MergeEvent {merge_id: m.merge_id})
        WHERE coalesce(event.status, 'ACTIVE') = 'ACTIVE'
      }
      WITH primary, duplicate, m
      RETURN primary.\`${safeIdField}\` AS canonicalEntityId,
             labels(primary)               AS canonicalLabels,
             properties(primary)           AS canonicalProps,
             collect({
               entityId:  duplicate.\`${safeIdField}\`,
               labels:    labels(duplicate),
               mergeId:   m.merge_id,
               mergedAt:  duplicate.merged_at,
               reason:    m.reason
             })                            AS duplicates
      ORDER BY canonicalEntityId
      `,
    );

    const groups = records.map((r) => {
      const canonicalProps = this.neo4j.toPlainObject(r.get('canonicalProps'));
      const canonicalLabels = (r.get('canonicalLabels') as string[]).filter(
        (l) => !INTERNAL_LABELS.has(l),
      );
      const duplicates = (r.get('duplicates') as any[]).map((d) => ({
        entityId: d.entityId,
        labels: (d.labels as string[]).filter((l) => !INTERNAL_LABELS.has(l)),
        mergeId: d.mergeId,
        mergedAt: d.mergedAt,
        reason: d.reason ?? null,
      }));

      return {
        canonicalEntityId: r.get('canonicalEntityId') as string,
        canonicalLabels,
        canonicalPreview: {
          name: canonicalProps['name'],
          first_name: canonicalProps['first_name'],
          last_name: canonicalProps['last_name'],
          email: canonicalProps['email'],
        },
        duplicateCount: duplicates.length,
        duplicates,
      };
    });

    return {
      groups,
      totalGroups: groups.length,
      totalDuplicates: groups.reduce((sum, g) => sum + g.duplicateCount, 0),
    };
  }

  async updateByEntityId(entityId: string, properties: Record<string, any>) {
    if (!entityId?.trim()) {
      throw new BadRequestException('entityId is required');
    }

    const safeProps = this.sanitizeUpdateProperties(properties);
    if (!Object.keys(safeProps).length) {
      throw new BadRequestException('No properties provided to update');
    }

    const resolution = await this.resolveCanonicalEntityId(entityId);
    const canonicalId = resolution.canonicalEntityId;
    const safeIdField = this.neo4j.sanitizeIdentifier(EntityResolutionService.CANONICAL_ID_FIELD);

    const currentRecords = await this.neo4j.runQuery(
      `MATCH (n:Entity {\`${safeIdField}\`: $id}) RETURN n, labels(n) AS labels LIMIT 1`,
      { id: canonicalId },
    );

    if (!currentRecords.length) {
      throw new NotFoundException(`Entity ${canonicalId} not found`);
    }

    const currentProps = this.neo4j.toPlainObject(currentRecords[0].get('n').properties ?? {});
    const existingKeys = new Set(Object.keys(currentProps));
    const immutableKeys = new Set<string>([
      EntityResolutionService.CANONICAL_ID_FIELD,
      'canonical_entity_id',
      'is_merged',
      'merged_at',
    ]);

    const inputKeys = Object.keys(safeProps);
    const updatableKeys = inputKeys.filter(
      (key) => existingKeys.has(key) && !immutableKeys.has(key),
    );
    const updatableKeySet = new Set(updatableKeys);
    const skippedKeys = inputKeys.filter((key) => !updatableKeySet.has(key));

    if (!updatableKeys.length) {
      throw new BadRequestException('None of the provided properties exist on the entity node');
    }

    const setParts = updatableKeys.map((key) => `n.\`${key}\` = $prop_${key}`);
    const params: Record<string, any> = { id: canonicalId };
    for (const key of updatableKeys) {
      params[`prop_${key}`] = safeProps[key];
    }

    const records = await this.neo4j.runQuery(
      `MATCH (n:Entity {\`${safeIdField}\`: $id})
       SET ${setParts.join(', ')}
       RETURN n, labels(n) AS labels`,
      params,
    );

    const labels = ((records[0].get('labels') as string[]) ?? []).filter(
      (label) => !INTERNAL_LABELS.has(label),
    );

    return {
      ...this.neo4j.toPlainObject(records[0].get('n').properties),
      labels,
      entityId: canonicalId,
      requestedEntityId: entityId,
      updatedProperties: updatableKeys,
      skippedProperties: skippedKeys,
      _identity: await this.buildMutationContextForEntity(entityId, true),
    };
  }

  private sanitizeUpdateProperties(properties: Record<string, any>): Record<string, any> {
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
      throw new BadRequestException('properties must be an object');
    }

    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (value === undefined || value === null) {
        continue;
      }

      const safeKey = this.neo4j.sanitizeIdentifier(String(key).trim());
      result[safeKey] = value;
    }

    return result;
  }

  async deleteByEntityId(entityId: string) {
    if (!entityId?.trim()) {
      throw new BadRequestException('entityId is required');
    }

    const resolution = await this.resolveCanonicalEntityId(entityId);
    const canonicalId = resolution.canonicalEntityId;
    const safeIdField = this.neo4j.sanitizeIdentifier(EntityResolutionService.CANONICAL_ID_FIELD);

    // Fetch labels before deletion for the response
    const labelRecords = await this.neo4j.runQuery(
      `MATCH (n:Entity {\`${safeIdField}\`: $id}) RETURN labels(n) AS labels LIMIT 1`,
      { id: canonicalId },
    );

    if (!labelRecords.length) {
      throw new NotFoundException(`Entity ${canonicalId} not found`);
    }

    const labels = (labelRecords[0].get('labels') as string[]).filter(
      (l) => !INTERNAL_LABELS.has(l),
    );

    await this.neo4j.runQuery(
      `MATCH (n:Entity {\`${safeIdField}\`: $id}) DETACH DELETE n`,
      { id: canonicalId },
    );

    return {
      deleted: true,
      entityId: canonicalId,
      requestedEntityId: entityId,
      labels,
    };
  }
}

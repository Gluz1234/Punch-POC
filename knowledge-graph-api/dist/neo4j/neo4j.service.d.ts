import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Session } from 'neo4j-driver';
export declare class Neo4jService implements OnModuleInit, OnModuleDestroy {
    private driver;
    private readonly logger;
    private readonly uri;
    private readonly username;
    private readonly password;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    session(): Session;
    runQuery(cypher: string, params?: Record<string, any>): Promise<any[]>;
    private applyConstraints;
    createConstraintForLabel(label: string, idField: string): Promise<void>;
    toPlainObject(properties: Record<string, any>): Record<string, any>;
    private convertValue;
    sanitizeIdentifier(name: string): string;
}

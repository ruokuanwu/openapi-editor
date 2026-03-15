import type { SchemaObject, OpenApiDoc } from '@shared/types';
import { isReferenceObject } from './resolve';

const MAX_DEPTH = 5;

/**
 * 根据 OpenAPI SchemaObject 生成 Mock 示例数据（人类友好的 JSON 实例，而非元数据）。
 * 优先级: schema.example > schema.enum[0] > 按 type 推断
 */
export function generateMockData(
    schema: SchemaObject | undefined | null,
    doc?: OpenApiDoc | null,
    depth = 0,
    visited: Set<string> = new Set(),
): unknown {
    if (!schema) { return null; }
    if (depth >= MAX_DEPTH) { return null; }

    // Resolve $ref first
    if (isReferenceObject(schema)) {
        const name = schema.$ref.match(/^#\/components\/schemas\/(.+)$/)?.[1];
        if (!name) { return null; }
        if (visited.has(name)) { return {}; }
        const resolved = doc?.components?.schemas?.[name];
        if (!resolved) { return null; }
        const nextVisited = new Set(visited);
        nextVisited.add(name);
        return generateMockData(resolved, doc, depth + 1, nextVisited);
    }

    // Prefer explicit example
    if (schema.example !== undefined) { return schema.example; }

    // Prefer first enum value
    if (schema.enum && schema.enum.length > 0) { return schema.enum[0]; }

    // Default values if no default field
    if (schema.default !== undefined) { return schema.default; }

    const type = schema.type;

    if (type === 'boolean') { return true; }

    if (type === 'integer' || type === 'number') {
        const fmt = schema.format;
        if (fmt === 'float' || fmt === 'double') { return 0.0; }
        return 0;
    }

    if (type === 'string') {
        return mockString(schema.format);
    }

    if (type === 'array') {
        const items = schema.items;
        if (!items) { return []; }
        return [generateMockData(items, doc, depth + 1, visited)];
    }

    if (type === 'object' || schema.properties) {
        const obj: Record<string, unknown> = {};
        const properties = schema.properties ?? {};
        for (const [key, propSchema] of Object.entries(properties)) {
            obj[key] = generateMockData(propSchema, doc, depth + 1, visited);
        }
        return obj;
    }

    // Fallback
    return null;
}

function mockString(format?: string): string {
    switch (format) {
        case 'date': return '2024-01-01';
        case 'date-time': return '2024-01-01T00:00:00Z';
        case 'time': return '00:00:00';
        case 'email': return 'user@example.com';
        case 'uri':
        case 'url': return 'https://example.com';
        case 'uuid': return '00000000-0000-0000-0000-000000000000';
        case 'hostname': return 'example.com';
        case 'ipv4': return '127.0.0.1';
        case 'ipv6': return '::1';
        case 'byte': return 'c3RyaW5n';
        case 'binary': return '<binary>';
        case 'password': return '••••••••';
        default: return 'string';
    }
}

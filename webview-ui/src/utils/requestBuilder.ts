import type { OperationObject, OpenApiDoc, SchemaObject } from '../types';
import type { useConfigStore } from '../store/useConfigStore';
import type { RunRequest, RunInstanceParam, RunInstanceBody } from '../types';
import { isReferenceObject, resolveSchema, resolveParameter, resolveRequestBody } from './resolve';

type ConfigStore = ReturnType<typeof useConfigStore>;

/** 从 schema 中取 example 或 default 值，转为字符串 */
function schemaValue(schema?: { example?: unknown; default?: unknown }): string | undefined {
    if (!schema) { return undefined; }
    const v = schema.example ?? schema.default;
    if (v === undefined || v === null) { return undefined; }
    return String(v);
}

/** Resolve a $ref string to the actual SchemaObject from doc.components.schemas */
function resolveRef(ref: string, doc: OpenApiDoc): SchemaObject | undefined {
    const prefix = '#/components/schemas/';
    if (!ref.startsWith(prefix)) { return undefined; }
    const name = ref.slice(prefix.length);
    return doc.components?.schemas?.[name];
}

// /** Resolve schema (following $ref if needed) */
// function resolveSchema(schema: SchemaObject, doc: OpenApiDoc): SchemaObject {
//     if (isReferenceObject(schema)) {
//         return resolveRef(schema.$ref, doc) ?? schema;
//     }
//     return schema;
// }

/**
 * Recursively generate a skeleton JSON value (JavaScript object/primitive) from a schema.
 * Used to build the initial textContent for the run instance body.
 */
function generateSchemaValue(schema: SchemaObject, doc: OpenApiDoc, depth = 0): unknown {
    if (depth > 5) { return null; } // prevent infinite recursion

    const resolved = resolveSchema(schema, doc);
    if (resolved === undefined) { return null; }

    if (resolved.example !== undefined) { return resolved.example; }
    if (resolved.default !== undefined) { return resolved.default; }

    if (resolved.type === 'object' || resolved.properties) {
        const obj: Record<string, unknown> = {};
        for (const [key, prop] of Object.entries(resolved.properties ?? {})) {
            obj[key] = generateSchemaValue(prop, doc, depth + 1);
        }
        return obj;
    }
    if (resolved.type === 'array') {
        if (resolved.items) {
            return [generateSchemaValue(resolved.items, doc, depth + 1)];
        }
        return [];
    }
    if (resolved.type === 'boolean') { return false; }
    if (resolved.type === 'integer' || resolved.type === 'number') { return 0; }
    if (resolved.enum && resolved.enum.length > 0) { return resolved.enum[0]; }
    return '';
}

/**
 * Generate a skeleton JSON string for use as initial textContent in run instance body editor.
 */
export function generateSchemaExample(schema: SchemaObject, doc: OpenApiDoc): string {
    const value = generateSchemaValue(schema, doc);
    return JSON.stringify(value, null, 2);
}

/**
 * Build formContent (flat key→value map) from schema properties.
 * Only one level deep — nested objects become empty string placeholders.
 */
export function buildFormContentFromSchema(schema: SchemaObject, doc: OpenApiDoc): Record<string, string> {
    const resolved = resolveSchema(schema, doc);
    if (resolved === undefined) { return {}; }
    const result: Record<string, string> = {};
    for (const [key, prop] of Object.entries(resolved.properties ?? {})) {
        const val = schemaValue(resolveSchema(prop, doc));
        result[key] = val ?? '';
    }
    return result;
}

export function buildRunRequest(
    operation: OperationObject,
    path: string,
    configStore: ConfigStore,
    doc: OpenApiDoc
): RunRequest {
    const method = ''; // caller fills this in; we return the method too

    // ── Base URL ──────────────────────────────────────────────────────────────
    const activeEnvId = configStore.config.activeEnvironment;
    const activeEnv = configStore.config.environments.find((e) => e.id === activeEnvId);
    const baseUrl = activeEnv?.baseUrl?.replace(/\/$/, '')
        ?? doc.servers?.[0]?.url?.replace(/\/$/, '')
        ?? '';

    // ── Resolve path params ───────────────────────────────────────────────────
    let resolvedPath = path;
    const pathParams = (operation.parameters ?? []).filter((p) => {
        const _p = resolveParameter(doc, p);
        return _p?.in === 'path';
    });
    for (const p of pathParams) {
        const _p = resolveParameter(doc, p)!;
        const s = resolveSchema(doc, _p?.schema);
        const v = schemaValue(s);
        resolvedPath = resolvedPath.replace(`{${_p.name}}`, v ?? `{${_p.name}}`);
    }

    // ── Query string ──────────────────────────────────────────────────────────
    const queryParams = (operation.parameters ?? []).filter((p) => {
        const _p = resolveParameter(doc, p);
        return _p?.in === 'query';
    });
    const queryParts: string[] = [];
    for (const p of queryParams) {
        const _p = resolveParameter(doc, p)!;
        const s = resolveSchema(doc, _p?.schema);
        const v = schemaValue(s);
        if (v !== undefined) {
            queryParts.push(`${encodeURIComponent(_p.name)}=${encodeURIComponent(v)}`);
        }
    }
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const url = `${baseUrl}${resolvedPath}${queryString}`;

    // ── Headers ───────────────────────────────────────────────────────────────
    const headers: Record<string, string> = {};

    // header params from operation
    const headerParams = (operation.parameters ?? []).filter((p) => {
        const _p = resolveParameter(doc, p);
        return _p?.in === 'header';
    });
    for (const p of headerParams) {
        const _p = resolveParameter(doc, p)!;
        const s = resolveSchema(doc, _p?.schema);
        const v = schemaValue(s);
        if (v !== undefined) {
            headers[_p.name] = v;
        }
    }

    // auth
    const auth = configStore.config.auth;
    if (auth.type === 'bearer' && auth.bearer?.token) {
        headers['Authorization'] = `Bearer ${auth.bearer.token}`;
    } else if (auth.type === 'basic' && auth.basic?.username) {
        const encoded = btoa(`${auth.basic.username}:${auth.basic.password ?? ''}`);
        headers['Authorization'] = `Basic ${encoded}`;
    } else if (auth.type === 'apikey' && auth.apikey?.key && auth.apikey?.value) {
        if (auth.apikey.in === 'header') {
            headers[auth.apikey.key] = auth.apikey.value;
        }
    }

    // ── Body ──────────────────────────────────────────────────────────────────
    let body: string | undefined;
    const requestBody = resolveRequestBody(doc, operation.requestBody);
    if (requestBody?.content) {
        const contentTypes = Object.keys(requestBody.content);
        if (contentTypes.length > 0) {
            const firstContentType = contentTypes[0];
            const mediaType = requestBody.content[firstContentType];
            const s = mediaType?.schema ? resolveSchema(mediaType.schema, doc) : undefined;
            if (s !== undefined) {
                body = typeof s === 'string'
                    ? s
                    : JSON.stringify(s, null, 2);
            } else if (mediaType.example !== undefined) {
                body = typeof mediaType.example === 'string'
                    ? mediaType.example
                    : JSON.stringify(mediaType.example, null, 2);
            }
            if (body !== undefined) {
                headers['Content-Type'] = firstContentType;
            }
        }
    }

    // apikey in query added to URL (already handled above via queryParts for named params;
    // apikey-in-query is a separate global auth not per-param)
    // We rebuild URL if apikey in query
    let finalUrl = url;
    if (auth.type === 'apikey' && auth.apikey?.key && auth.apikey?.value && auth.apikey.in === 'query') {
        const sep = finalUrl.includes('?') ? '&' : '?';
        finalUrl = `${finalUrl}${sep}${encodeURIComponent(auth.apikey.key)}=${encodeURIComponent(auth.apikey.value)}`;
    }

    return { method, url: finalUrl, headers, body };
}

/**
 * Build a RunRequest from the user-edited run instance state (params + body).
 * This is used by RunInstancePanel when sending the request.
 */
export function buildRunRequestFromInstance(
    params: RunInstanceParam[],
    body: RunInstanceBody | null,
    bodyEditorMode: 'text' | 'form',
    path: string,
    method: string,
    configStore: ConfigStore,
    doc: OpenApiDoc,
): RunRequest {
    // ── Base URL ──────────────────────────────────────────────────────────────
    const activeEnvId = configStore.config.activeEnvironment;
    const activeEnv = configStore.config.environments.find((e) => e.id === activeEnvId);
    const baseUrl = activeEnv?.baseUrl?.replace(/\/$/, '')
        ?? doc.servers?.[0]?.url?.replace(/\/$/, '')
        ?? '';

    // ── Resolve path params ───────────────────────────────────────────────────
    let resolvedPath = path;
    for (const p of params.filter((p) => p.in === 'path')) {
        if (p.value) {
            resolvedPath = resolvedPath.replace(`{${p.name}}`, p.value);
        }
    }

    // ── Query string ──────────────────────────────────────────────────────────
    const queryParts: string[] = [];
    for (const p of params.filter((p) => p.in === 'query')) {
        if (p.value !== '') {
            queryParts.push(`${encodeURIComponent(p.name)}=${encodeURIComponent(p.value)}`);
        }
    }
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const url = `${baseUrl}${resolvedPath}${queryString}`;

    // ── Headers ───────────────────────────────────────────────────────────────
    const headers: Record<string, string> = {};

    for (const p of params.filter((p) => p.in === 'header')) {
        if (p.value !== '') {
            headers[p.name] = p.value;
        }
    }

    // auth
    const auth = configStore.config.auth;
    if (auth.type === 'bearer' && auth.bearer?.token) {
        headers['Authorization'] = `Bearer ${auth.bearer.token}`;
    } else if (auth.type === 'basic' && auth.basic?.username) {
        const encoded = btoa(`${auth.basic.username}:${auth.basic.password ?? ''}`);
        headers['Authorization'] = `Basic ${encoded}`;
    } else if (auth.type === 'apikey' && auth.apikey?.key && auth.apikey?.value) {
        if (auth.apikey.in === 'header') {
            headers[auth.apikey.key] = auth.apikey.value;
        }
    }

    // ── Body ──────────────────────────────────────────────────────────────────
    let bodyStr: string | undefined;
    if (body) {
        if (bodyEditorMode === 'text') {
            bodyStr = body.textContent || undefined;
        } else {
            // form mode: serialize formContent to JSON
            const formObj: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(body.formContent)) {
                // Try to parse as JSON value (number/boolean/object); fallback to string
                try {
                    formObj[k] = JSON.parse(v);
                } catch {
                    formObj[k] = v;
                }
            }
            bodyStr = Object.keys(formObj).length > 0 ? JSON.stringify(formObj, null, 2) : undefined;
        }
        if (bodyStr !== undefined) {
            headers['Content-Type'] = body.contentType;
        }
    }

    // apikey in query
    let finalUrl = url;
    if (auth.type === 'apikey' && auth.apikey?.key && auth.apikey?.value && auth.apikey.in === 'query') {
        const sep = finalUrl.includes('?') ? '&' : '?';
        finalUrl = `${finalUrl}${sep}${encodeURIComponent(auth.apikey.key)}=${encodeURIComponent(auth.apikey.value)}`;
    }

    return { method, url: finalUrl, headers, body: bodyStr };
}

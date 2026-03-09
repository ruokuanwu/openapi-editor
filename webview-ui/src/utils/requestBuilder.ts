import type { OperationObject, OpenApiDoc } from '../types';
import type { useConfigStore } from '../store/useConfigStore';
import type { RunRequest } from '../types';

type ConfigStore = ReturnType<typeof useConfigStore>;

/** 从 schema 中取 example 或 default 值，转为字符串 */
function schemaValue(schema?: { example?: unknown; default?: unknown }): string | undefined {
    if (!schema) { return undefined; }
    const v = schema.example ?? schema.default;
    if (v === undefined || v === null) { return undefined; }
    return String(v);
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
    const pathParams = (operation.parameters ?? []).filter((p) => p.in === 'path');
    for (const p of pathParams) {
        const v = schemaValue(p.schema);
        resolvedPath = resolvedPath.replace(`{${p.name}}`, v ?? `{${p.name}}`);
    }

    // ── Query string ──────────────────────────────────────────────────────────
    const queryParams = (operation.parameters ?? []).filter((p) => p.in === 'query');
    const queryParts: string[] = [];
    for (const p of queryParams) {
        const v = schemaValue(p.schema);
        if (v !== undefined) {
            queryParts.push(`${encodeURIComponent(p.name)}=${encodeURIComponent(v)}`);
        }
    }
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const url = `${baseUrl}${resolvedPath}${queryString}`;

    // ── Headers ───────────────────────────────────────────────────────────────
    const headers: Record<string, string> = {};

    // header params from operation
    const headerParams = (operation.parameters ?? []).filter((p) => p.in === 'header');
    for (const p of headerParams) {
        const v = schemaValue(p.schema);
        if (v !== undefined) {
            headers[p.name] = v;
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
    if (operation.requestBody?.content) {
        const contentTypes = Object.keys(operation.requestBody.content);
        if (contentTypes.length > 0) {
            const firstContentType = contentTypes[0];
            const mediaType = operation.requestBody.content[firstContentType];
            if (mediaType.schema?.example !== undefined) {
                body = typeof mediaType.schema.example === 'string'
                    ? mediaType.schema.example
                    : JSON.stringify(mediaType.schema.example, null, 2);
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

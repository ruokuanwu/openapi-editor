import type { OperationObject, OpenApiDoc, HttpMethod } from '../types';
import type { useConfigStore } from '../store/useConfigStore';
import { buildRunRequest } from './requestBuilder';

type ConfigStore = ReturnType<typeof useConfigStore>;

/** 构建 cURL 命令字符串 */
export function buildCurl(
    operation: OperationObject,
    path: string,
    method: HttpMethod,
    configStore: ConfigStore,
    doc: OpenApiDoc
): string {
    const req = buildRunRequest(operation, path, configStore, doc);
    const parts: string[] = [`curl -X ${method.toUpperCase()}`];

    // URL
    parts.push(`  '${req.url}'`);

    // Headers
    for (const [k, v] of Object.entries(req.headers)) {
        parts.push(`  -H '${k}: ${v}'`);
    }

    // Body
    if (req.body !== undefined) {
        // Escape single quotes in body
        const escaped = req.body.replace(/'/g, "'\\''");
        parts.push(`  -d '${escaped}'`);
    }

    return parts.join(' \\\n');
}

/** 提取单条接口的 OpenAPI JSON（最小化的 OpenAPI 文档结构） */
export function buildOpenapiJson(
    path: string,
    method: HttpMethod,
    doc: OpenApiDoc
): string {
    const pathItem = doc.paths?.[path];
    if (!pathItem) { return '{}'; }

    const operation = pathItem[method];
    if (!operation) { return '{}'; }

    const minDoc = {
        openapi: doc.openapi,
        info: doc.info,
        ...(doc.servers ? { servers: doc.servers } : {}),
        paths: {
            [path]: {
                [method]: operation,
            },
        },
    };

    return JSON.stringify(minDoc, null, 2);
}

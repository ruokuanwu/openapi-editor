// Shared type definitions – mirrors src/shared/types.ts in the extension host.

import { OpenAPIV3_1 } from 'openapi-types';
import { OperationObject, ParameterObject, SchemaObject, ResponseObject, RequestBodyObject, OpenApiDoc, NormalSchemaObjectType } from '@shared/types';



export interface InfoObject {
    title: string;
    version: string;
    description?: string;
    contact?: { name?: string; url?: string; email?: string };
    license?: { name: string; url?: string };
}



export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' | 'trace';

export const HTTP_METHODS: HttpMethod[] = [
    'get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace',
];

export interface PathItemObject {
    summary?: string;
    description?: string;
    get?: OperationObject;
    put?: OperationObject;
    post?: OperationObject;
    delete?: OperationObject;
    patch?: OperationObject;
    options?: OperationObject;
    head?: OperationObject;
    trace?: OperationObject;
    parameters?: ParameterObject[];
    servers?: ServerObject[];
}



export type ParameterIn = 'path' | 'query' | 'header' | 'cookie';



export type HeaderObject = OpenAPIV3_1.HeaderObject;



export interface MediaTypeObject {
    schema?: SchemaObject;
    example?: unknown;
}

export type ResponsesObject = Record<string, ResponseObject>;


export interface ComponentsObject {
    schemas?: Record<string, SchemaObject>;
    responses?: Record<string, ResponseObject>;
    parameters?: Record<string, ParameterObject>;
    requestBodies?: Record<string, RequestBodyObject>;
    securitySchemes?: Record<string, unknown>;
}

export interface TagObject {
    name: string;
    description?: string;
}

export interface ServerObject {
    url: string;
    description?: string;
    variables?: Record<string, { default: string; description?: string; enum?: string[] }>;
}

// ─── Editor Config ──────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark';

export interface EditorConfig {
    environments: Environment[];
    activeEnvironment?: string;
    auth: AuthConfig;
    mock: MockConfig;
    requestHistory: RequestHistoryItem[];
    theme?: ThemeMode;
}

export interface Environment {
    id: string;
    name: string;
    baseUrl: string;
    variables: EnvVariable[];
}

export interface EnvVariable {
    key: string;
    value: string;
    description?: string;
}

export type AuthType = 'none' | 'bearer' | 'basic' | 'apikey';

export interface AuthConfig {
    type: AuthType;
    bearer?: { token: string };
    basic?: { username: string; password: string };
    apikey?: { key: string; value: string; in: 'header' | 'query' };
}

export interface MockConfig {
    enabled: boolean;
    delay?: number;
    rules: MockRule[];
}

export interface MockRule {
    id: string;
    path: string;
    method: string;
    status: number;
    response: unknown;
}

export interface RequestHistoryItem {
    id: string;
    timestamp: number;
    method: string;
    path: string;
    status?: number;
}

// ─── Run Instance ────────────────────────────────────────────────────────────

export interface RunInstanceParam {
    name: string;
    in: ParameterIn;
    required: boolean;
    description: string;
    value: string;
    isCustom: boolean;
    type: NormalSchemaObjectType;
}

export interface RunInstanceBody {
    contentType: string;
    textContent: string;
    formContent: Record<string, string>;
}

// ─── Run / Debug ────────────────────────────────────────────────────────────

export interface RunRequest {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
}

export interface RunResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    duration: number;
}

export interface RunResult {
    request: RunRequest;
    response?: RunResponse;
    error?: string;
}

// ─── Message Protocol ────────────────────────────────────────────────────────

export type ExtToWebviewMessage =
    | { type: 'init'; doc: OpenApiDoc; config: EditorConfig }
    | { type: 'docChanged'; doc: OpenApiDoc }
    | { type: 'configUpdated'; config: EditorConfig }
    | { type: 'runResponse'; id: string; status: number; statusText: string; headers: Record<string, string>; body: string; duration: number }
    | { type: 'runError'; id: string; error: string };

export type WebviewToExtMessage =
    | { type: 'ready' }
    | { type: 'save'; doc: OpenApiDoc }
    | { type: 'updateConfig'; config: Partial<EditorConfig> }
    | { type: 'runRequest'; id: string; method: string; url: string; headers: Record<string, string>; body?: string };

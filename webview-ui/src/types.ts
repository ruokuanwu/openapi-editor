// Shared type definitions – mirrors src/shared/types.ts in the extension host.

export interface OpenApiDoc {
    openapi: string;
    info: InfoObject;
    paths?: PathsObject;
    components?: ComponentsObject;
    tags?: TagObject[];
    servers?: ServerObject[];
}

export interface InfoObject {
    title: string;
    version: string;
    description?: string;
    contact?: { name?: string; url?: string; email?: string };
    license?: { name: string; url?: string };
}

export type PathsObject = Record<string, PathItemObject>;

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

export interface OperationObject {
    operationId?: string;
    summary?: string;
    description?: string;
    tags?: string[];
    parameters?: ParameterObject[];
    requestBody?: RequestBodyObject;
    responses?: ResponsesObject;
    deprecated?: boolean;
    security?: Record<string, string[]>[];
}

export type ParameterIn = 'path' | 'query' | 'header' | 'cookie';

export interface ParameterObject {
    name: string;
    in: ParameterIn;
    description?: string;
    required?: boolean;
    deprecated?: boolean;
    schema?: SchemaObject;
}

export interface RequestBodyObject {
    description?: string;
    required?: boolean;
    content: Record<string, MediaTypeObject>;
}

export interface MediaTypeObject {
    schema?: SchemaObject;
    example?: unknown;
}

export type ResponsesObject = Record<string, ResponseObject>;

export interface ResponseObject {
    description: string;
    content?: Record<string, MediaTypeObject>;
    headers?: Record<string, unknown>;
}

export interface SchemaObject {
    type?: string;
    format?: string;
    title?: string;
    description?: string;
    default?: unknown;
    example?: unknown;
    enum?: unknown[];
    properties?: Record<string, SchemaObject>;
    required?: string[];
    items?: SchemaObject;
    additionalProperties?: SchemaObject | boolean;
    nullable?: boolean;
    readOnly?: boolean;
    writeOnly?: boolean;
    $ref?: string;
    allOf?: SchemaObject[];
    anyOf?: SchemaObject[];
    oneOf?: SchemaObject[];
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    minItems?: number;
    maxItems?: number;
}

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

export interface EditorConfig {
    environments: Environment[];
    activeEnvironment?: string;
    auth: AuthConfig;
    mock: MockConfig;
    requestHistory: RequestHistoryItem[];
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

// ─── Message Protocol ────────────────────────────────────────────────────────

export type ExtToWebviewMessage =
    | { type: 'init'; doc: OpenApiDoc; config: EditorConfig }
    | { type: 'docChanged'; doc: OpenApiDoc };

export type WebviewToExtMessage =
    | { type: 'ready' }
    | { type: 'save'; doc: OpenApiDoc }
    | { type: 'updateConfig'; config: Partial<EditorConfig> };

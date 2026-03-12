// openapiRefUtils.ts
// import { OpenAPIV3 } from 'openapi-types';
import { type SchemaObject, type ResponseObject, type RequestBodyObject, type ParameterObject, type HeaderObject } from '../types';

export enum RefType {
    Schema = 'schema',
    Parameter = 'parameter',
    Response = 'response',
    Example = 'example',
    RequestBody = 'requestBody',
    Header = 'header',
    SecurityScheme = 'securityScheme',
    Link = 'link',
    Callback = 'callback',
    Unknown = 'unknown'
}

/**
 * 判断是否为 referenceObject (包含 $ref 的对象)
 */
export function isReferenceObject(obj: unknown): obj is { $ref: string } {
    return typeof obj === 'object' && obj !== null && '$ref' in obj;
}


export function isArraySchemaObject(schema: SchemaObject | undefined): schema is { type: 'array'; items: SchemaObject } {
    return schema !== undefined && schema.type === 'array';
}

/**
 * 判断 $ref 指向的类型
 */
export function getRefType(ref: string): RefType {
    if (!ref.startsWith('#/components/')) return RefType.Unknown;
    const parts = ref.split('/');
    switch (parts[2]) {
        case 'schemas': return RefType.Schema;
        case 'parameters': return RefType.Parameter;
        case 'responses': return RefType.Response;
        case 'examples': return RefType.Example;
        case 'requestBodies': return RefType.RequestBody;
        case 'headers': return RefType.Header;
        case 'securitySchemes': return RefType.SecurityScheme;
        case 'links': return RefType.Link;
        case 'callbacks': return RefType.Callback;
        default: return RefType.Unknown;
    }
}

/**
 * 强制 resolve $ref 为特定类型
 */
export function resolveRefAsType<T>(
    doc: any,
    refObj: { $ref: string },
    expectedType: RefType
): T {
    const refType = getRefType(refObj.$ref);
    if (refType !== expectedType) {
        throw new Error(`Ref类型不匹配，期望: ${expectedType}，实际: ${refType}`);
    }
    const resolved = getObjectByRef(doc, refObj.$ref);
    return resolved as T;
}

/**
 * 通用 $ref 解析
 */
export function getObjectByRef(doc: any, ref: string): any {
    if (!ref.startsWith('#/')) throw new Error('只支持内部引用');
    const path = ref.slice(2).split('/');
    let result: any = doc;
    for (const key of path) {
        result = result[key];
        if (result === undefined) throw new Error(`未找到引用: ${ref}`);
    }
    return result;
}

//

// 解析为 Schema 类型
export function resolveRefAsSchema(
    doc: any,
    refObj: { $ref: string }
): SchemaObject {
    return resolveRefAsType<SchemaObject>(doc, refObj, RefType.Schema);
}

// 解析为 Parameter 类型
export function resolveRefAsParameter(
    doc: any,
    refObj: { $ref: string }
): ParameterObject {
    return resolveRefAsType<ParameterObject>(doc, refObj, RefType.Parameter);
}

// 解析为 Response 类型
export function resolveRefAsResponse(
    doc: any,
    refObj: { $ref: string }
): ResponseObject {
    return resolveRefAsType<ResponseObject>(doc, refObj, RefType.Response);
}

// 解析为 RequestBody 类型
export function resolveRefAsRequestBody(
    doc: any,
    refObj: { $ref: string }
): RequestBodyObject {
    return resolveRefAsType<RequestBodyObject>(doc, refObj, RefType.RequestBody);
}

// 解析为 Header 类型
export function resolveRefAsHeader(
    doc: any,
    refObj: { $ref: string }
): HeaderObject {
    return resolveRefAsType<HeaderObject>(doc, refObj, RefType.Header);
}

/**
 * 通用 resolve，支持 $ref 或直接对象
 */
export function resolveObject<T>(
    doc: any,
    obj: T | { $ref: string } | undefined,
    expectedType: RefType
): T | undefined {
    if (obj && typeof obj === 'object' && '$ref' in obj) {
        return resolveRefAsType<T>(doc, obj as { $ref: string }, expectedType);
    }
    return obj as T;
}

// 用法举例：解析 schema
export function resolveSchema(
    doc: any,
    obj: SchemaObject | { $ref: string } | undefined
): SchemaObject | undefined {
    return resolveObject<SchemaObject>(doc, obj, RefType.Schema);
}

// 解析 parameter
export function resolveParameter(
    doc: any,
    obj: ParameterObject | { $ref: string } | undefined
): ParameterObject | undefined {
    return resolveObject<ParameterObject>(doc, obj, RefType.Parameter);
}

// 解析 response
export function resolveResponse(
    doc: any,
    obj: ResponseObject | { $ref: string } | undefined
): ResponseObject | undefined {
    return resolveObject<ResponseObject>(doc, obj, RefType.Response);
}

export function resolveRequestBody(
    doc: any,
    obj: RequestBodyObject | { $ref: string } | undefined
): RequestBodyObject | undefined {
    return resolveObject<RequestBodyObject>(doc, obj, RefType.RequestBody);
}

export function resolveHeader(
    doc: any,
    obj: HeaderObject | { $ref: string } | undefined
): HeaderObject | undefined {
    return resolveObject<HeaderObject>(doc, obj, RefType.Header);
}
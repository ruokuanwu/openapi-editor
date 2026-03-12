import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { RunResult, RunRequest, RunInstanceParam, RunInstanceBody, ParameterIn, SchemaObject } from '../types';
import type { OperationObject, OpenApiDoc } from '../types';
import { generateSchemaExample, buildFormContentFromSchema } from '../utils/requestBuilder';
import { generateMockData } from '../utils/mockGenerator';
import { resolveSchema, resolveParameter, resolveRequestBody } from '../utils/resolve';

export const useRunStore = defineStore('run', () => {
    const isOpen = ref(false);
    const loading = ref(false);
    const result = ref<RunResult | null>(null);

    // Main tab: 'edit' (schema editor) | 'run' (run instance)
    const activeMainTab = ref<'edit' | 'run'>('edit');

    // Run instance state (independent copy from schema, user-editable)
    const instanceParams = ref<RunInstanceParam[]>([]);
    const instanceBody = ref<RunInstanceBody | null>(null);
    const bodyEditorMode = ref<'text' | 'form'>('text');

    // pending run requests: id → original RunRequest
    const pendingRequests = new Map<string, RunRequest>();

    function open() {
        isOpen.value = true;
    }

    function close() {
        isOpen.value = false;
        loading.value = false;
        result.value = null;
        activeMainTab.value = 'edit';
        instanceParams.value = [];
        instanceBody.value = null;
        bodyEditorMode.value = 'text';
    }

    function setActiveMainTab(tab: 'edit' | 'run') {
        activeMainTab.value = tab;
    }

    function setLoading(v: boolean) {
        loading.value = v;
    }

    function setResult(r: RunResult) {
        result.value = r;
        loading.value = false;
        isOpen.value = true;
    }

    /** Derive a string value for a parameter: example > default > mock */
    function mockParamValue(schema: SchemaObject | undefined, doc: OpenApiDoc): string {
        if (!schema) { return ''; }
        if (schema.example !== undefined && schema.example !== null) { return String(schema.example); }
        if (schema.default !== undefined && schema.default !== null) { return String(schema.default); }
        const mocked = generateMockData(schema, doc);
        if (mocked === null || mocked === undefined) { return ''; }
        if (typeof mocked === 'object') { return JSON.stringify(mocked); }
        return String(mocked);
    }

    /** Initialize run instance from operation definition (called when clicking Run button) */
    function initInstance(op: OperationObject, path: string, doc: OpenApiDoc) {
        // Build params from operation parameters
        const params: RunInstanceParam[] = (op.parameters ?? []).map((p) => {
            const _p = resolveParameter(doc, p)!;
            const s = resolveSchema(doc, _p.schema);
            const value = mockParamValue(s, doc);
            return {
                name: _p.name,
                in: _p.in as ParameterIn,
                required: _p.required ?? false,
                description: p.description ?? '',
                value,
                isCustom: false,
            };
        });
        instanceParams.value = params;

        // Build body from operation requestBody
        const requestBody = resolveRequestBody(doc, op.requestBody);
        if (requestBody?.content) {
            const contentTypes = Object.keys(requestBody.content);
            const firstCt = contentTypes[0] ?? 'application/json';
            const mediaType = requestBody.content[firstCt];
            const schema = mediaType?.schema;

            const textContent = schema ? generateSchemaExample(schema, doc) : '';
            const formContent = schema ? buildFormContentFromSchema(schema, doc) : {};

            instanceBody.value = {
                contentType: firstCt,
                textContent,
                formContent,
            };
        } else {
            instanceBody.value = null;
        }

        bodyEditorMode.value = 'text';
        // Reset previous result when re-initializing
        result.value = null;
        loading.value = false;
        isOpen.value = false;
    }

    /** Called by EndpointEditor before sending runRequest message */
    function expectResponse(id: string, request: RunRequest) {
        pendingRequests.set(id, request);
    }

    /** Called by App.vue when runResponse arrives from extension host */
    function handleResponse(msg: {
        id: string;
        status: number;
        statusText: string;
        headers: Record<string, string>;
        body: string;
        duration: number;
    }) {
        const request = pendingRequests.get(msg.id);
        pendingRequests.delete(msg.id);
        if (!request) { return; }
        setResult({
            request,
            response: {
                status: msg.status,
                statusText: msg.statusText,
                headers: msg.headers,
                body: msg.body,
                duration: msg.duration,
            },
        });
    }

    /** Called by App.vue when runError arrives from extension host */
    function handleError(id: string, error: string) {
        const request = pendingRequests.get(id);
        pendingRequests.delete(id);
        if (!request) { return; }
        setResult({ request, error });
    }

    return {
        isOpen, loading, result,
        activeMainTab, instanceParams, instanceBody, bodyEditorMode,
        open, close, setLoading, setResult, setActiveMainTab,
        expectResponse, handleResponse, handleError,
        initInstance,
    };
});


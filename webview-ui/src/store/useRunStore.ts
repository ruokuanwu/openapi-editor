import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { RunResult, RunRequest, RunInstanceParam, RunInstanceBody, ParameterIn } from '../types';
import type { OperationObject, OpenApiDoc } from '../types';
import { generateSchemaExample, buildFormContentFromSchema } from '../utils/requestBuilder';

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

    /** Initialize run instance from operation definition (called when clicking Run button) */
    function initInstance(op: OperationObject, path: string, doc: OpenApiDoc) {
        // Build params from operation parameters
        const params: RunInstanceParam[] = (op.parameters ?? []).map((p) => {
            let value = '';
            if (p.schema?.example !== undefined && p.schema.example !== null) {
                value = String(p.schema.example);
            } else if (p.schema?.default !== undefined && p.schema.default !== null) {
                value = String(p.schema.default);
            }
            return {
                name: p.name,
                in: p.in as ParameterIn,
                required: p.required ?? false,
                description: p.description ?? '',
                value,
                isCustom: false,
            };
        });
        instanceParams.value = params;

        // Build body from operation requestBody
        if (op.requestBody?.content) {
            const contentTypes = Object.keys(op.requestBody.content);
            const firstCt = contentTypes[0] ?? 'application/json';
            const mediaType = op.requestBody.content[firstCt];
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


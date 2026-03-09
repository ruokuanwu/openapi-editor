import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { RunResult, RunRequest } from '../types';

export const useRunStore = defineStore('run', () => {
    const isOpen = ref(false);
    const loading = ref(false);
    const result = ref<RunResult | null>(null);

    // pending run requests: id → original RunRequest
    const pendingRequests = new Map<string, RunRequest>();

    function open() {
        isOpen.value = true;
    }

    function close() {
        isOpen.value = false;
        loading.value = false;
        result.value = null;
    }

    function setLoading(v: boolean) {
        loading.value = v;
    }

    function setResult(r: RunResult) {
        result.value = r;
        loading.value = false;
        isOpen.value = true;
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
        open, close, setLoading, setResult,
        expectResponse, handleResponse, handleError,
    };
});


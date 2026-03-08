import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
    OpenApiDoc,
    HttpMethod,
    OperationObject,
    TagObject,
} from '../types';
import { HTTP_METHODS } from '../types';

export interface EndpointItem {
    path: string;
    method: HttpMethod;
    summary?: string;
    tags: string[];
    deprecated?: boolean;
}

export interface EndpointGroup {
    tag: string;
    description?: string;
    endpoints: EndpointItem[];
}

export const useDocStore = defineStore('doc', () => {
    const doc = ref<OpenApiDoc | null>(null);
    const selectedPath = ref<string | null>(null);
    const selectedMethod = ref<HttpMethod | null>(null);

    // ── Computed ──────────────────────────────────────────────────────────────

    const endpointGroups = computed((): EndpointGroup[] => {
        if (!doc.value?.paths) { return []; }

        const paths = doc.value.paths;
        const tagMap: Record<string, EndpointItem[]> = {};
        const ungrouped: EndpointItem[] = [];

        for (const path of Object.keys(paths)) {
            const item = paths[path];
            for (const method of HTTP_METHODS) {
                const op = item[method];
                if (!op) { continue; }
                const endpoint: EndpointItem = {
                    path,
                    method,
                    summary: op.summary,
                    tags: op.tags ?? [],
                    deprecated: op.deprecated,
                };
                if (op.tags && op.tags.length > 0) {
                    for (const tag of op.tags) {
                        if (!tagMap[tag]) { tagMap[tag] = []; }
                        // Avoid duplicate entries if an endpoint has the same tag twice
                        if (!tagMap[tag].some((e) => e.path === path && e.method === method)) {
                            tagMap[tag].push(endpoint);
                        }
                    }
                } else {
                    ungrouped.push(endpoint);
                }
            }
        }

        const docTags = doc.value.tags ?? [];
        const groups: EndpointGroup[] = [];

        for (const tag of docTags) {
            groups.push({
                tag: tag.name,
                description: tag.description,
                endpoints: tagMap[tag.name] ?? [],
            });
            delete tagMap[tag.name];
        }

        // Tags referenced by operations but not declared in doc.tags
        for (const tag of Object.keys(tagMap)) {
            groups.push({ tag, endpoints: tagMap[tag] });
        }

        if (ungrouped.length > 0) {
            groups.unshift({ tag: '(未分组)', endpoints: ungrouped });
        }

        return groups;
    });

    const selectedOperation = computed((): OperationObject | null => {
        if (!doc.value?.paths || !selectedPath.value || !selectedMethod.value) {
            return null;
        }
        const item = doc.value.paths[selectedPath.value];
        if (!item) { return null; }
        return item[selectedMethod.value] ?? null;
    });

    const allTags = computed((): string[] => {
        return (doc.value?.tags ?? []).map((t) => t.name);
    });

    // ── Actions ───────────────────────────────────────────────────────────────

    function setDoc(newDoc: OpenApiDoc) {
        doc.value = newDoc;
    }

    function selectEndpoint(path: string, method: HttpMethod) {
        selectedPath.value = path;
        selectedMethod.value = method;
    }

    function clearSelection() {
        selectedPath.value = null;
        selectedMethod.value = null;
    }

    function addEndpoint(path: string, method: HttpMethod) {
        if (!doc.value) { return; }
        if (!doc.value.paths) { doc.value.paths = {}; }
        if (!doc.value.paths[path]) { doc.value.paths[path] = {}; }
        doc.value.paths[path][method] = {
            summary: '',
            description: '',
            tags: [],
            parameters: [],
            responses: {
                '200': { description: 'Successful response' },
            },
        };
        selectEndpoint(path, method);
    }

    function removeEndpoint(path: string, method: HttpMethod) {
        if (!doc.value?.paths?.[path]) { return; }
        delete doc.value.paths[path][method];
        // Remove entire path item if all methods are gone
        if (HTTP_METHODS.every((m) => !doc.value!.paths![path][m])) {
            delete doc.value.paths[path];
        }
        if (selectedPath.value === path && selectedMethod.value === method) {
            selectedPath.value = null;
            selectedMethod.value = null;
        }
    }

    function renameEndpoint(
        oldPath: string,
        oldMethod: HttpMethod,
        newPath: string,
        newMethod: HttpMethod
    ) {
        if (!doc.value?.paths?.[oldPath]?.[oldMethod]) { return; }
        const op = doc.value.paths[oldPath][oldMethod]!;

        if (!doc.value.paths[newPath]) { doc.value.paths[newPath] = {}; }
        doc.value.paths[newPath][newMethod] = op;

        delete doc.value.paths[oldPath][oldMethod];
        if (HTTP_METHODS.every((m) => !doc.value!.paths![oldPath][m])) {
            delete doc.value.paths[oldPath];
        }

        if (selectedPath.value === oldPath && selectedMethod.value === oldMethod) {
            selectedPath.value = newPath;
            selectedMethod.value = newMethod;
        }
    }

    function updateOperation(path: string, method: HttpMethod, op: OperationObject) {
        if (!doc.value?.paths?.[path]) { return; }
        doc.value.paths[path][method] = op;
    }

    function updateInfo(info: Partial<OpenApiDoc['info']>) {
        if (!doc.value) { return; }
        doc.value.info = { ...doc.value.info, ...info };
    }

    function addTag(tag: TagObject) {
        if (!doc.value) { return; }
        if (!doc.value.tags) { doc.value.tags = []; }
        if (!doc.value.tags.some((t) => t.name === tag.name)) {
            doc.value.tags.push(tag);
        }
    }

    function removeTag(name: string) {
        if (!doc.value?.tags) { return; }
        doc.value.tags = doc.value.tags.filter((t) => t.name !== name);
    }

    return {
        doc,
        selectedPath,
        selectedMethod,
        endpointGroups,
        selectedOperation,
        allTags,
        setDoc,
        selectEndpoint,
        clearSelection,
        addEndpoint,
        removeEndpoint,
        renameEndpoint,
        updateOperation,
        updateInfo,
        addTag,
        removeTag,
    };
});

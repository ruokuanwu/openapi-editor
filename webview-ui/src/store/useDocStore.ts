import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
    OpenApiDoc,
    HttpMethod,
    OperationObject,
    TagObject,
    SchemaObject,
    ResponseObject,
    ParameterObject,
    RequestBodyObject,
} from '../types';
import { HTTP_METHODS } from '../types';

export type ComponentType = 'schemas' | 'responses' | 'parameters' | 'requestBodies';

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
    const selectedComponentType = ref<ComponentType | null>(null);
    const selectedComponentName = ref<string | null>(null);

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

    const allSchemaNames = computed((): string[] => {
        return Object.keys(doc.value?.components?.schemas ?? {});
    });

    const selectedComponent = computed(() => {
        if (!doc.value?.components || !selectedComponentType.value || !selectedComponentName.value) {
            return null;
        }
        const section = doc.value.components[selectedComponentType.value] as Record<string, unknown> | undefined;
        return section?.[selectedComponentName.value] ?? null;
    });

    // ── Actions ───────────────────────────────────────────────────────────────

    function setDoc(newDoc: OpenApiDoc) {
        doc.value = newDoc;
    }

    function selectEndpoint(path: string, method: HttpMethod) {
        selectedPath.value = path;
        selectedMethod.value = method;
        selectedComponentType.value = null;
        selectedComponentName.value = null;
    }

    function clearSelection() {
        selectedPath.value = null;
        selectedMethod.value = null;
        selectedComponentType.value = null;
        selectedComponentName.value = null;
    }

    function selectComponent(type: ComponentType, name: string) {
        selectedComponentType.value = type;
        selectedComponentName.value = name;
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

    // ── Component CRUD ───────────────────────────────────────────────────────

    type ComponentValueMap = {
        schemas: SchemaObject;
        responses: ResponseObject;
        parameters: ParameterObject;
        requestBodies: RequestBodyObject;
    };

    function ensureComponents() {
        if (!doc.value) { return; }
        if (!doc.value.components) { doc.value.components = {}; }
    }

    function addComponent<T extends ComponentType>(type: T, name: string, value: ComponentValueMap[T]) {
        if (!doc.value) { return; }
        ensureComponents();
        if (!doc.value.components![type]) { (doc.value.components as Record<string, unknown>)[type] = {}; }
        (doc.value.components![type] as Record<string, unknown>)[name] = value;
        selectComponent(type, name);
    }

    function removeComponent(type: ComponentType, name: string) {
        if (!doc.value?.components?.[type]) { return; }
        delete (doc.value.components[type] as Record<string, unknown>)[name];
        if (selectedComponentType.value === type && selectedComponentName.value === name) {
            selectedComponentType.value = null;
            selectedComponentName.value = null;
        }
    }

    function updateComponent(type: ComponentType, name: string, value: unknown) {
        if (!doc.value?.components?.[type]) { return; }
        (doc.value.components[type] as Record<string, unknown>)[name] = value;
    }

    function renameComponent(type: ComponentType, oldName: string, newName: string) {
        if (!doc.value?.components?.[type]) { return; }
        if (!newName || newName === oldName) { return; }
        const section = doc.value.components[type] as Record<string, unknown>;
        if (!section[oldName]) { return; }
        // Move the value
        section[newName] = section[oldName];
        delete section[oldName];
        // Update all $ref strings across the document
        const oldRef = `#/components/${type}/${oldName}`;
        const newRef = `#/components/${type}/${newName}`;
        const docStr = JSON.stringify(doc.value);
        const updated = docStr.replaceAll(JSON.stringify(oldRef), JSON.stringify(newRef));
        // Avoid full replacement if nothing changed
        if (updated !== docStr) {
            const newDoc = JSON.parse(updated) as OpenApiDoc;
            doc.value = newDoc;
        }
        // Update selection
        if (selectedComponentType.value === type && selectedComponentName.value === oldName) {
            selectedComponentName.value = newName;
        }
    }

    return {
        doc,
        selectedPath,
        selectedMethod,
        selectedComponentType,
        selectedComponentName,
        endpointGroups,
        selectedOperation,
        selectedComponent,
        allTags,
        allSchemaNames,
        setDoc,
        selectEndpoint,
        clearSelection,
        selectComponent,
        addEndpoint,
        removeEndpoint,
        renameEndpoint,
        updateOperation,
        updateInfo,
        addTag,
        removeTag,
        addComponent,
        removeComponent,
        renameComponent,
        updateComponent,
    };
});

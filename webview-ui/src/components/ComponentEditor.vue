<template>
    <div class="component-editor" v-if="docStore.selectedComponentName && docStore.selectedComponentType">
        <!-- Header -->
        <div class="comp-header">
            <el-tag class="comp-type-badge" :type="typeBadgeType" size="small">{{ typeLabel }}</el-tag>
            <el-input
                v-model="localName"
                class="comp-name-input"
                size="large"
                :disabled="!isEditing"
                @blur="handleRename"
                @keydown.enter="($event.target as HTMLInputElement).blur()"
                placeholder="组件名称"
            />
            <el-button v-if="!isEditing" type="primary" size="small" @click="startEditing">编辑</el-button>
            <template v-else>
                <el-button type="success" size="small" @click="saveAndExit">保存</el-button>
                <el-button type="danger" plain size="small" @click="cancelEdit">取消</el-button>
            </template>
        </div>

        <el-divider style="margin: 8px 0" />

        <div class="comp-edit-body" :class="{ 'is-readonly': !isEditing }">

        <!-- Schema metadata (only for schemas type) -->
        <template v-if="docStore.selectedComponentType === 'schemas' && schemaValue">
            <el-form label-width="80px" label-position="left" size="small" class="meta-form">
                <el-form-item label="标题">
                    <el-input v-model="(schemaValue as SchemaObject).title" placeholder="Schema 标题" />
                </el-form-item>
                <el-form-item label="描述">
                    <el-input v-model="(schemaValue as SchemaObject).description" type="textarea" :rows="2" placeholder="Schema 描述" />
                </el-form-item>
                <el-form-item label="示例">
                    <el-input
                        v-model="exampleText"
                        type="textarea"
                        :rows="3"
                        placeholder='{"key": "value"}'
                        @blur="applyExample"
                    />
                    <div v-if="exampleError" class="example-error">{{ exampleError }}</div>
                </el-form-item>
            </el-form>
            <el-divider style="margin: 8px 0" />
            <div class="schema-title-row">
                <span class="schema-title">Schema 定义</span>
                <el-button-group size="small">
                    <el-button :type="schemaViewMode === 'visual' ? 'primary' : ''" size="small" @click="schemaViewMode = 'visual'">表格</el-button>
                    <el-button :type="schemaViewMode === 'json' ? 'primary' : ''" size="small" @click="schemaViewMode = 'json'">JSON</el-button>
                </el-button-group>
            </div>
            <SchemaEditor v-if="schemaViewMode === 'visual'" :schema="schemaValue as SchemaObject" :readonly="!isEditing" />
            <pre v-else class="mock-json">{{ JSON.stringify(generateMockData(schemaValue as SchemaObject, docStore.doc), null, 2) }}</pre>
        </template>

        <!-- Response editor -->
        <template v-else-if="docStore.selectedComponentType === 'responses' && responseValue">
            <el-form label-width="80px" label-position="left" size="small" class="meta-form">
                <el-form-item label="描述">
                    <el-input v-model="(responseValue as ResponseObject).description" placeholder="响应说明" />
                </el-form-item>
            </el-form>
            <el-divider style="margin: 8px 0" />
            <div class="schema-title">响应内容</div>
            <ResponseBodyEditor :response="responseValue as ResponseObject" />
        </template>

        <!-- Parameter editor -->
        <template v-else-if="docStore.selectedComponentType === 'parameters' && paramValue">
            <el-form label-width="80px" label-position="left" size="small" class="meta-form">
                <el-form-item label="参数名">
                    <el-input v-model="(paramValue as ParameterObject).name" placeholder="参数名" />
                </el-form-item>
                <el-form-item label="位置">
                    <el-select v-model="(paramValue as ParameterObject).in" style="width: 140px">
                        <el-option v-for="p in ['path','query','header','cookie']" :key="p" :label="p" :value="p" />
                    </el-select>
                </el-form-item>
                <el-form-item label="必填">
                    <el-switch v-model="(paramValue as ParameterObject).required" />
                </el-form-item>
                <el-form-item label="描述">
                    <el-input v-model="(paramValue as ParameterObject).description" placeholder="参数说明" />
                </el-form-item>
            </el-form>
            <el-divider style="margin: 8px 0" />
            <div class="schema-title-row">
                <span class="schema-title">Schema</span>
                <el-button-group size="small">
                    <el-button :type="paramViewMode === 'visual' ? 'primary' : ''" size="small" @click="paramViewMode = 'visual'">表格</el-button>
                    <el-button :type="paramViewMode === 'json' ? 'primary' : ''" size="small" @click="paramViewMode = 'json'">JSON</el-button>
                </el-button-group>
            </div>
            <SchemaEditor v-if="paramViewMode === 'visual' && ensureParamSchema(paramValue as ParameterObject)" :schema="(paramValue as ParameterObject).schema!" :readonly="!isEditing" />
            <pre v-else-if="paramViewMode === 'json' && ensureParamSchema(paramValue as ParameterObject)" class="mock-json">{{ JSON.stringify(generateMockData((paramValue as ParameterObject).schema!, docStore.doc), null, 2) }}</pre>
        </template>

        <!-- RequestBody editor -->
        <template v-else-if="docStore.selectedComponentType === 'requestBodies' && reqBodyValue">
            <el-form label-width="80px" label-position="left" size="small" class="meta-form">
                <el-form-item label="必填">
                    <el-switch v-model="(reqBodyValue as RequestBodyObject).required" />
                </el-form-item>
                <el-form-item label="描述">
                    <el-input v-model="(reqBodyValue as RequestBodyObject).description" placeholder="请求体说明" />
                </el-form-item>
            </el-form>
            <el-divider style="margin: 8px 0" />
            <RequestBodyContentEditor :request-body="reqBodyValue as RequestBodyObject" />
        </template>
        </div>
    </div>

    <div v-else class="comp-empty-state">
        <el-empty description="请从左侧选择一个组件" :image-size="80" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, toRaw } from 'vue';
import { useDocStore } from '../store/useDocStore';
import type { ComponentType } from '../store/useDocStore';
import SchemaEditor from './SchemaEditor.vue';
import ResponseBodyEditor from './ResponseBodyEditor.vue';
import RequestBodyContentEditor from './RequestBodyContentEditor.vue';
import type { OpenApiDoc, SchemaObject, ResponseObject, ParameterObject, RequestBodyObject } from '../types';
import { generateMockData } from '../utils/mockGenerator';
import vscode from '../vscode';

const docStore = useDocStore();

// ── Local name (for rename) ──────────────────────────────────────────────────
const localName = ref(docStore.selectedComponentName ?? '');
const isEditing = ref(false);

interface ComponentEditSnapshot {
    doc: OpenApiDoc;
    type: ComponentType;
    name: string;
}
const preEditSnapshot = ref<ComponentEditSnapshot | null>(null);

// ── Schema/param view modes ───────────────────────────────────────────────────
const schemaViewMode = ref<'visual' | 'json'>('visual');
const paramViewMode = ref<'visual' | 'json'>('visual');

watch([() => docStore.selectedComponentName, () => docStore.selectedComponentType], ([n]) => {
    if ((!docStore.selectedComponentName || !docStore.selectedComponentType) && isEditing.value) {
        isEditing.value = false;
        preEditSnapshot.value = null;
        docStore.endEditSession('component');
    }
    localName.value = n ?? '';
    schemaViewMode.value = 'visual';
    paramViewMode.value = 'visual';
    if (docStore.selectedComponentType === 'schemas') {
        const s = schemaValue.value as SchemaObject | null;
        exampleText.value = s?.example !== undefined ? JSON.stringify(s.example, null, 2) : '';
    }
});

function handleRename() {
    if (!isEditing.value) { return; }
    const newName = localName.value.trim();
    const oldName = docStore.selectedComponentName;
    if (!newName || !oldName || newName === oldName) { return; }
    docStore.renameComponent(docStore.selectedComponentType!, oldName, newName);
}

function startEditing() {
    if (!docStore.doc || !docStore.selectedComponentType || !docStore.selectedComponentName) {
        return;
    }
    preEditSnapshot.value = {
        doc: JSON.parse(JSON.stringify(toRaw(docStore.doc))) as OpenApiDoc,
        type: docStore.selectedComponentType,
        name: docStore.selectedComponentName,
    };
    docStore.startEditSession('component');
    docStore.setEditSessionDirty(false);
    isEditing.value = true;
}

function saveAndExit() {
    preEditSnapshot.value = null;
    isEditing.value = false;
    docStore.endEditSession('component');
    if (docStore.doc) {
        vscode.postMessage({ type: 'save', doc: toRaw(docStore.doc) });
    }
}

function cancelEdit() {
    const snap = preEditSnapshot.value;
    isEditing.value = false;
    docStore.endEditSession('component');
    if (snap) {
        docStore.setDoc(snap.doc);
        docStore.selectComponent(snap.type, snap.name);
        localName.value = snap.name;
    }
    preEditSnapshot.value = null;
}

function syncComponentDirtyState() {
    if (!isEditing.value || !preEditSnapshot.value || !docStore.doc) {
        docStore.setEditSessionDirty(false);
        return;
    }
    const current = JSON.stringify(toRaw(docStore.doc));
    const baseline = JSON.stringify(preEditSnapshot.value.doc);
    docStore.setEditSessionDirty(current !== baseline);
}

watch(
    () => docStore.doc,
    () => {
        syncComponentDirtyState();
    },
    { deep: true }
);

// ── Type helpers ─────────────────────────────────────────────────────────────
const typeLabel = computed(() => {
    const map: Record<string, string> = {
        schemas: 'Schema',
        responses: 'Response',
        parameters: 'Parameter',
        requestBodies: 'Request Body',
    };
    return map[docStore.selectedComponentType ?? ''] ?? '';
});

const typeBadgeType = computed((): '' | 'success' | 'warning' | 'danger' | 'info' => {
    const map: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
        schemas: '',
        responses: 'success',
        parameters: 'warning',
        requestBodies: 'info',
    };
    return map[docStore.selectedComponentType ?? ''] ?? '';
});

// ── value shortcuts ──────────────────────────────────────────────────────────
const schemaValue = computed(() =>
    docStore.selectedComponentType === 'schemas' ? docStore.selectedComponent : null
);
const responseValue = computed(() =>
    docStore.selectedComponentType === 'responses' ? docStore.selectedComponent : null
);
const paramValue = computed(() =>
    docStore.selectedComponentType === 'parameters' ? docStore.selectedComponent : null
);
const reqBodyValue = computed(() =>
    docStore.selectedComponentType === 'requestBodies' ? docStore.selectedComponent : null
);

// ── Example JSON editing ─────────────────────────────────────────────────────
const exampleText = ref('');
const exampleError = ref('');

function applyExample() {
    const text = exampleText.value.trim();
    const s = schemaValue.value as SchemaObject | null;
    if (!s) { return; }
    exampleError.value = '';
    if (!text) {
        delete s.example;
        return;
    }
    try {
        s.example = JSON.parse(text);
    } catch {
        exampleError.value = 'JSON 格式无效';
    }
}

// ── Param schema helper ──────────────────────────────────────────────────────
function ensureParamSchema(param: ParameterObject): boolean {
    if (!param.schema) { param.schema = { type: 'string' }; }
    return true;
}
</script>

<style scoped>
.component-editor {
    padding: 0 4px;
}

.comp-empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
}

.comp-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 0 6px;
}

.comp-type-badge {
    flex-shrink: 0;
}

.comp-name-input {
    flex: 1;
}

.comp-name-input :deep(.el-input__inner) {
    font-size: 18px;
    font-weight: 600;
}

.meta-form {
    margin-top: 4px;
}

.comp-edit-body.is-readonly {
    pointer-events: none;
}

.comp-edit-body.is-readonly .schema-title-row {
    pointer-events: auto;
}

.comp-edit-body.is-readonly :deep(.el-input__wrapper),
.comp-edit-body.is-readonly :deep(.el-textarea__inner),
.comp-edit-body.is-readonly :deep(.el-select__wrapper) {
    opacity: 0.9;
}

.schema-title {
    font-weight: 600;
    font-size: 12px;
    opacity: 0.8;
    margin-bottom: 8px;
}

.schema-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}

.schema-title-row .schema-title {
    margin-bottom: 0;
}

.mock-json {
    margin: 0;
    padding: 8px 10px;
    font-size: 12px;
    font-family: 'Consolas', 'Courier New', monospace;
    background: var(--vscode-textCodeBlock-background, #f5f5f5);
    border-radius: 4px;
    overflow-x: auto;
    white-space: pre;
    max-height: 400px;
    overflow-y: auto;
    color: var(--vscode-foreground, #333);
}

.example-error {
    color: #f56c6c;
    font-size: 11px;
    margin-top: 4px;
}
</style>

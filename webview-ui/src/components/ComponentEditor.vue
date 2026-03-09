<template>
    <div class="component-editor" v-if="docStore.selectedComponentName && docStore.selectedComponentType">
        <!-- Header -->
        <div class="comp-header">
            <el-tag class="comp-type-badge" :type="typeBadgeType" size="small">{{ typeLabel }}</el-tag>
            <el-input
                v-model="localName"
                class="comp-name-input"
                size="large"
                @blur="handleRename"
                @keydown.enter="($event.target as HTMLInputElement).blur()"
                placeholder="组件名称"
            />
            <el-popconfirm title="确认删除该组件？" @confirm="handleDelete" confirm-button-text="删除" cancel-button-text="取消">
                <template #reference>
                    <el-button type="danger" text :icon="Delete" size="small">删除</el-button>
                </template>
            </el-popconfirm>
        </div>

        <el-divider style="margin: 8px 0" />

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
            <div class="schema-title">Schema 定义</div>
            <SchemaEditor :schema="schemaValue as SchemaObject" />
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
            <div class="schema-title">Schema</div>
            <SchemaEditor v-if="ensureParamSchema(paramValue as ParameterObject)" :schema="(paramValue as ParameterObject).schema!" />
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

    <div v-else class="comp-empty-state">
        <el-empty description="请从左侧选择一个组件" :image-size="80" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Delete } from '@element-plus/icons-vue';
import { useDocStore } from '../store/useDocStore';
import SchemaEditor from './SchemaEditor.vue';
import ResponseBodyEditor from './ResponseBodyEditor.vue';
import RequestBodyContentEditor from './RequestBodyContentEditor.vue';
import type { SchemaObject, ResponseObject, ParameterObject, RequestBodyObject } from '../types';

const docStore = useDocStore();

// ── Local name (for rename) ──────────────────────────────────────────────────
const localName = ref(docStore.selectedComponentName ?? '');

watch(() => docStore.selectedComponentName, (n) => {
    localName.value = n ?? '';
    if (docStore.selectedComponentType === 'schemas') {
        const s = schemaValue.value as SchemaObject | null;
        exampleText.value = s?.example !== undefined ? JSON.stringify(s.example, null, 2) : '';
    }
});

function handleRename() {
    const newName = localName.value.trim();
    const oldName = docStore.selectedComponentName;
    if (!newName || !oldName || newName === oldName) { return; }
    docStore.renameComponent(docStore.selectedComponentType!, oldName, newName);
}

// ── Delete ───────────────────────────────────────────────────────────────────
function handleDelete() {
    if (docStore.selectedComponentType && docStore.selectedComponentName) {
        docStore.removeComponent(docStore.selectedComponentType, docStore.selectedComponentName);
    }
}

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

.schema-title {
    font-weight: 600;
    font-size: 12px;
    opacity: 0.8;
    margin-bottom: 8px;
}

.example-error {
    color: #f56c6c;
    font-size: 11px;
    margin-top: 4px;
}
</style>

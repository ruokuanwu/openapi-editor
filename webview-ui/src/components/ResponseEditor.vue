<template>
    <div class="response-editor">
        <div class="response-toolbar">
            <el-button size="small" :icon="Plus" type="primary" plain @click="addResponse">
                添加响应
            </el-button>
        </div>

        <el-empty v-if="!responseCodes.length" description="暂无响应定义" :image-size="60" />

        <el-collapse v-else v-model="openCodes" accordion>
            <el-collapse-item v-for="code in responseCodes" :key="code" :name="code">
                <template #title>
                    <div class="response-title">
                        <el-tag :type="statusTagType(code)" size="small">{{ code }}</el-tag>
                        <span class="response-desc">{{ responses[code].description }}</span>
                    </div>
                </template>

                <div class="response-body">
                    <!-- Status code & description -->
                    <el-form label-width="80px" label-position="left" size="small">
                        <el-form-item label="状态码">
                            <div style="display: flex; gap: 8px; align-items: center">
                                <el-input :model-value="code" style="width: 90px"
                                    @blur="(e: FocusEvent) => renameCode(code, (e.target as HTMLInputElement).value)" />
                                <el-button type="danger" text size="small" :icon="Delete" @click="removeResponse(code)">
                                    删除
                                </el-button>
                            </div>
                        </el-form-item>

                        <el-form-item label="描述">
                            <el-input v-model="responses[code].description" placeholder="响应说明" />
                        </el-form-item>
                    </el-form>

                    <!-- Content types tabs -->
                    <div v-if="responses[code].content" class="content-section">
                        <div class="content-type-bar">
                            <el-radio-group v-model="activeContentType[code]" size="small">
                                <el-radio-button v-for="ct in Object.keys(responses[code].content!)" :key="ct"
                                    :value="ct">
                                    {{ ct }}
                                </el-radio-button>
                            </el-radio-group>
                            <el-button size="small" :icon="Plus" plain @click="addContentTypeToResponse(code)" />
                        </div>

                        <div v-if="activeContentType[code] && responses[code].content![activeContentType[code]]"
                            class="schema-section">
                            <div class="schema-section-header">
                                <div class="schema-section-title">Schema</div>
                                <div class="schema-section-actions">
                                    <el-tooltip
                                        :content="responses[code].content![activeContentType[code]].schema?.$ref ? '更换引用组件' : '引用组件'"
                                        placement="top" :show-after="500">
                                        <el-button size="small" text :icon="Link"
                                            @click="openRefPicker(code)">
                                            {{ responses[code].content![activeContentType[code]].schema?.$ref ? '更换组件' : '引用组件' }}
                                        </el-button>
                                    </el-tooltip>
                                    <el-tooltip
                                        v-if="responses[code].content![activeContentType[code]].schema?.$ref"
                                        content="解除引用（内联展开）" placement="top" :show-after="500">
                                        <el-button size="small" text :icon="DocumentCopy"
                                            @click="derefSchema(code)" />
                                    </el-tooltip>
                                </div>
                            </div>
                            <SchemaEditor :schema="ensureSchema(responses[code].content![activeContentType[code]])" />
                        </div>
                    </div>

                    <!-- Add content type button when no content yet -->
                    <el-button v-if="!responses[code].content" size="small" :icon="Plus" plain
                        @click="initResponseContent(code)">
                        添加响应体
                    </el-button>
                </div>
            </el-collapse-item>
        </el-collapse>

        <!-- Ref Picker dialog -->
        <el-dialog v-model="showRefPicker" title="选择引用组件" width="400px" :append-to-body="true">
            <el-select v-model="pickedRef" filterable placeholder="搜索 Schema 名称" style="width: 100%">
                <el-option v-for="name in docStore.allSchemaNames" :key="name"
                    :label="name" :value="'#/components/schemas/' + name" />
            </el-select>
            <template #footer>
                <el-button @click="showRefPicker = false">取消</el-button>
                <el-button type="primary" @click="applyRefPick">确定</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { Plus, Delete, Link, DocumentCopy } from '@element-plus/icons-vue';
import { useDocStore } from '../store/useDocStore';
import SchemaEditor from './SchemaEditor.vue';
import type { SchemaObject, MediaTypeObject } from '../types';

const docStore = useDocStore();

const openCodes = ref<string>('');
const activeContentType = reactive<Record<string, string>>({});

const responses = computed(() => {
    const op = docStore.selectedOperation;
    if (!op) { return {}; }
    if (!op.responses) { op.responses = {}; }
    return op.responses;
});

const responseCodes = computed(() => Object.keys(responses.value));

function statusTagType(code: string): '' | 'success' | 'warning' | 'danger' | 'info' {
    const n = parseInt(code);
    if (n >= 500) { return 'danger'; }
    if (n >= 400) { return 'warning'; }
    if (n >= 200 && n < 300) { return 'success'; }
    return 'info';
}

function addResponse() {
    const op = docStore.selectedOperation;
    if (!op) { return; }
    if (!op.responses) { op.responses = {}; }
    const code = String(Object.keys(op.responses).length ? 201 + Object.keys(op.responses).length : 200);
    const finalCode = Object.keys(op.responses).includes(code) ? String(parseInt(code) + 1) : code;
    op.responses[finalCode] = { description: '' };
    openCodes.value = finalCode;
}

function removeResponse(code: string) {
    const op = docStore.selectedOperation;
    if (!op?.responses) { return; }
    delete op.responses[code];
}

function renameCode(oldCode: string, newCode: string) {
    const code = newCode.trim();
    if (!code || code === oldCode) { return; }
    const op = docStore.selectedOperation;
    if (!op?.responses) { return; }
    op.responses[code] = op.responses[oldCode];
    delete op.responses[oldCode];
}

function initResponseContent(code: string) {
    const op = docStore.selectedOperation;
    if (!op?.responses?.[code]) { return; }
    op.responses[code].content = {
        'application/json': { schema: { type: 'object', properties: {} } },
    };
    activeContentType[code] = 'application/json';
}

function addContentTypeToResponse(code: string) {
    const op = docStore.selectedOperation;
    if (!op?.responses?.[code]) { return; }
    if (!op.responses[code].content) { op.responses[code].content = {}; }
    const ct = 'application/json';
    op.responses[code].content![ct] = { schema: { type: 'object', properties: {} } };
    activeContentType[code] = ct;
}

function ensureSchema(mediaType: MediaTypeObject): SchemaObject {
    if (!mediaType.schema) { mediaType.schema = { type: 'object', properties: {} }; }
    return mediaType.schema;
}

// ── Import component (ref picker) ────────────────────────────────────────────
const showRefPicker = ref(false);
const pickedRef = ref('');
const refPickerCode = ref('');

function openRefPicker(code: string) {
    refPickerCode.value = code;
    const schema = responses.value[code]?.content?.[activeContentType[code]]?.schema;
    pickedRef.value = schema?.$ref ?? '';
    showRefPicker.value = true;
}

function applyRefPick() {
    const code = refPickerCode.value;
    if (!pickedRef.value || !code) { showRefPicker.value = false; return; }
    const ct = activeContentType[code];
    if (!ct || !responses.value[code]?.content?.[ct]) { showRefPicker.value = false; return; }
    responses.value[code].content![ct].schema = { $ref: pickedRef.value };
    showRefPicker.value = false;
}

function derefSchema(code: string) {
    const ct = activeContentType[code];
    if (!ct) { return; }
    const schema = responses.value[code]?.content?.[ct]?.schema;
    if (!schema?.$ref) { return; }
    const name = schema.$ref.match(/^#\/components\/schemas\/(.+)$/)?.[1];
    if (!name) { return; }
    const resolved = docStore.doc?.components?.schemas?.[name];
    if (!resolved) { return; }
    responses.value[code].content![ct].schema = JSON.parse(JSON.stringify(resolved));
}
</script>

<style scoped>
.response-editor {
    padding: 4px 0;
}

.response-toolbar {
    margin-bottom: 8px;
}

.response-title {
    display: flex;
    align-items: center;
    gap: 8px;
}

.response-desc {
    font-size: 12px;
    opacity: 0.8;
}

.response-body {
    padding: 8px 0;
}

.content-section {
    margin-top: 12px;
}

.content-type-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
}

.schema-section-title {
    font-weight: 600;
    font-size: 12px;
    opacity: 0.8;
}

.schema-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}

.schema-section-actions {
    display: flex;
    gap: 4px;
    align-items: center;
}
</style>

<template>
    <div class="run-instance-panel">
        <!-- Top: Method + Path (read-only) + Send button -->
        <div class="ri-header">
            <span :class="['method-badge', `method-${method}`]">{{ method.toUpperCase() }}</span>
            <span class="ri-path">{{ path }}</span>
            <div class="ri-header-actions">
                <el-button
                    type="primary"
                    size="small"
                    :icon="Promotion"
                    :loading="runStore.loading"
                    @click="doSend"
                >发送</el-button>
                <el-button
                    type="warning"
                    size="small"
                    :icon="Download"
                    @click="doExportCurl"
                >导出</el-button>
            </div>
        </div>

        <div class="ri-body">
            <!-- Parameters section -->
            <div class="ri-section">
                <div class="ri-section-header">
                    <span class="ri-section-title">参数</span>
                    <el-button size="small" text :icon="Plus" @click="addCustomParam">添加自定义参数</el-button>
                </div>

                <div v-if="params.length === 0" class="ri-empty-hint">暂无参数</div>

                <el-table v-else :data="params" size="small" class="ri-param-table">
                    <el-table-column label="位置" width="100">
                        <template #default="{ row }">
                            <el-select v-if="row.isCustom" v-model="row.in" size="small" style="width: 100%">
                                <el-option v-for="loc in PARAM_LOCATIONS" :key="loc" :label="loc" :value="loc" />
                            </el-select>
                            <span v-else class="ri-param-in-tag">{{ row.in }}</span>
                        </template>
                    </el-table-column>

                    <el-table-column label="名称" min-width="100">
                        <template #default="{ row }">
                            <el-input
                                v-if="row.isCustom"
                                v-model="row.name"
                                size="small"
                                placeholder="参数名"
                            />
                            <span v-else class="ri-param-name">
                                {{ row.name }}
                                <el-tag v-if="row.required" type="danger" size="small" class="ri-required-tag">必填</el-tag>
                            </span>
                        </template>
                    </el-table-column>

                    <el-table-column label="值" min-width="130">
                        <template #default="{ row }">
                            <el-input v-model="row.value" size="small" :placeholder="row.description || '参数值'" />
                        </template>
                    </el-table-column>

                    <el-table-column label="" width="40">
                        <template #default="{ $index, row }">
                            <el-button
                                v-if="row.isCustom"
                                size="small"
                                type="danger"
                                text
                                :icon="Delete"
                                @click="removeParam($index)"
                            />
                        </template>
                    </el-table-column>
                </el-table>
            </div>

            <!-- Request Body section -->
            <div v-if="body !== null" class="ri-section">
                <div class="ri-section-header">
                    <span class="ri-section-title">请求体</span>
                    <div class="ri-body-controls">
                        <!-- Content-Type selector -->
                        <el-select v-model="body.contentType" size="small" style="width: 190px">
                            <el-option
                                v-for="ct in availableContentTypes"
                                :key="ct"
                                :label="ct"
                                :value="ct"
                            />
                            <template v-if="!availableContentTypes.includes(body.contentType)">
                                <el-option :label="body.contentType" :value="body.contentType" />
                            </template>
                        </el-select>

                        <!-- Text / Form toggle -->
                        <el-radio-group v-model="bodyEditorMode" size="small">
                            <el-radio-button value="text">文本</el-radio-button>
                            <el-radio-button value="form">表单</el-radio-button>
                        </el-radio-group>
                    </div>
                </div>

                <!-- Text editor -->
                <div v-if="bodyEditorMode === 'text'" class="ri-textarea-wrapper">
                    <el-input
                        v-model="body.textContent"
                        type="textarea"
                        :autosize="{ minRows: 6, maxRows: 20 }"
                        placeholder='{"key": "value"}'
                        class="ri-textarea"
                    />
                </div>

                <!-- Form editor -->
                <div v-else class="ri-form-editor">
                    <el-table :data="formRows" size="small" class="ri-form-table">
                        <el-table-column label="字段" min-width="120">
                            <template #default="{ row }">
                                <el-input
                                    v-if="row.isCustom"
                                    v-model="row.key"
                                    size="small"
                                    placeholder="字段名"
                                    @change="onFormKeyChange(row)"
                                />
                                <span v-else class="ri-param-name">{{ row.key }}</span>
                            </template>
                        </el-table-column>
                        <el-table-column label="值" min-width="160">
                            <template #default="{ row }">
                                <el-input
                                    v-model="row.value"
                                    size="small"
                                    placeholder="字段值"
                                    @change="onFormValueChange(row)"
                                />
                            </template>
                        </el-table-column>
                        <el-table-column label="" width="40">
                            <template #default="{ row }">
                                <el-button
                                    v-if="row.isCustom"
                                    size="small"
                                    type="danger"
                                    text
                                    :icon="Delete"
                                    @click="removeFormRow(row.key)"
                                />
                            </template>
                        </el-table-column>
                    </el-table>
                    <div class="ri-form-add">
                        <el-button size="small" text :icon="Plus" @click="addFormRow">添加字段</el-button>
                    </div>
                </div>
            </div>

            <!-- No body -->
            <div v-else class="ri-section">
                <div class="ri-section-header">
                    <span class="ri-section-title">请求体</span>
                    <el-button size="small" text :icon="Plus" @click="addBody">启用请求体</el-button>
                </div>
                <div class="ri-empty-hint">该接口定义中无请求体，可手动启用</div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, watch, toRaw } from 'vue';
import { Plus, Delete, Promotion, Download } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useDocStore } from '../store/useDocStore';
import { useConfigStore } from '../store/useConfigStore';
import { useRunStore } from '../store/useRunStore';
import { buildRunRequestFromInstance } from '../utils/requestBuilder';
import { buildCurl } from '../utils/exportUtils';
import vscode from '../vscode';
import type { ParameterIn } from '../types';

const PARAM_LOCATIONS: ParameterIn[] = ['query', 'header', 'path', 'cookie'];

const COMMON_CONTENT_TYPES = [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain',
];

const docStore = useDocStore();
const configStore = useConfigStore();
const runStore = useRunStore();
const op = computed(() => docStore.selectedOperation);
const method = computed(() => docStore.selectedMethod ?? 'get');
const path = computed(() => docStore.selectedPath ?? '');

if (!(!op.value || !path.value || !docStore.doc)) {
    runStore.initInstance(toRaw(op.value), path.value, toRaw(docStore.doc));
}

// Proxy store state for convenient template access
const params = computed(() => runStore.instanceParams);
const body = computed(() => runStore.instanceBody);
const bodyEditorMode = computed({
    get: () => runStore.bodyEditorMode,
    set: (v) => {
        // Sync between text and form on mode switch
        if (v === 'form' && body.value) {
            // text → form: parse JSON and populate formContent
            try {
                const parsed = JSON.parse(body.value.textContent);
                if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                    const fc: Record<string, string> = {};
                    for (const [k, val] of Object.entries(parsed)) {
                        fc[k] = typeof val === 'string' ? val : JSON.stringify(val);
                    }
                    body.value.formContent = fc;
                }
            } catch { /* keep existing formContent */ }
        } else if (v === 'text' && body.value) {
            // form → text: serialize formContent to JSON
            const formObj: Record<string, unknown> = {};
            for (const [k, val] of Object.entries(body.value.formContent)) {
                try { formObj[k] = JSON.parse(val); } catch { formObj[k] = val; }
            }
            if (Object.keys(formObj).length > 0) {
                body.value.textContent = JSON.stringify(formObj, null, 2);
            }
        }
        runStore.bodyEditorMode = v;
    },
});

// Available content types (from schema definition + current selection)
const availableContentTypes = computed(() => {
    const op = docStore.selectedOperation;
    const ctFromOp = op?.requestBody?.content ? Object.keys(op.requestBody.content) : [];
    const combined = [...new Set([...ctFromOp, ...COMMON_CONTENT_TYPES])];
    return combined;
});

// Form rows: combines schema-defined fields (isCustom=false) + user-added fields (isCustom=true)
interface FormRow { key: string; value: string; isCustom: boolean }

const schemaKeys = computed(() => {
    const op = docStore.selectedOperation;
    if (!body.value || !op?.requestBody?.content) { return new Set<string>(); }
    const media = op.requestBody.content[body.value.contentType]
        ?? Object.values(op.requestBody.content)[0];
    const schema = media?.schema;
    if (!schema?.properties) { return new Set<string>(); }
    return new Set(Object.keys(schema.properties));
});

const formRows = computed((): FormRow[] => {
    if (!body.value) { return []; }
    const rows: FormRow[] = [];
    const fc = body.value.formContent;
    const sk = schemaKeys.value;

    // Schema-defined fields first
    for (const key of sk) {
        rows.push({ key, value: fc[key] ?? '', isCustom: false });
    }
    // Custom fields
    for (const key of Object.keys(fc)) {
        if (!sk.has(key)) {
            rows.push({ key, value: fc[key], isCustom: true });
        }
    }
    return rows;
});

function onFormValueChange(row: FormRow) {
    if (body.value) {
        body.value.formContent[row.key] = row.value;
    }
}

function onFormKeyChange(row: FormRow) {
    if (body.value && row.key) {
        // Rename key in formContent
        const fc = body.value.formContent;
        const oldVal = fc['__new__'] ?? '';
        delete fc['__new__'];
        fc[row.key] = oldVal;
    }
}

function addFormRow() {
    if (body.value) {
        const newKey = `field${Object.keys(body.value.formContent).length + 1}`;
        body.value.formContent[newKey] = '';
    }
}

function removeFormRow(key: string) {
    if (body.value) {
        delete body.value.formContent[key];
    }
}

function addCustomParam() {
    runStore.instanceParams.push({
        name: '',
        in: 'query',
        required: false,
        description: '',
        value: '',
        isCustom: true,
    });
}

function removeParam(index: number) {
    runStore.instanceParams.splice(index, 1);
}

function addBody() {
    runStore.instanceBody = {
        contentType: 'application/json',
        textContent: '{}',
        formContent: {},
    };
}

async function doSend() {
    const m = method.value;
    const p = path.value;
    const doc = docStore.doc;
    if (!doc) { return; }

    const req = buildRunRequestFromInstance(
        runStore.instanceParams,
        runStore.instanceBody,
        runStore.bodyEditorMode,
        p,
        m.toUpperCase(),
        configStore,
        doc,
    );

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    runStore.expectResponse(id, req);
    runStore.setLoading(true);
    runStore.isOpen = true;

    vscode.postMessage({ type: 'runRequest', id, method: req.method, url: req.url, headers: req.headers, body: req.body });
}

async function doExportCurl() {
    const op = docStore.selectedOperation;
    const p = path.value;
    const m = method.value;
    const doc = docStore.doc;
    if (!op || !p || !m || !doc) { return; }

    const text = buildCurl(toRaw(op), p, m, configStore, toRaw(doc));
    navigator.clipboard.writeText(text).then(() => {
        ElMessage.success('已复制');
    }).catch(() => {
        ElMessage.error('复制失败，请手动复制');
    });
}
</script>

<style scoped>
.run-instance-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
}

/* ── Header ── */
.ri-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--vscode-panel-border, #e4e7ed);
    background: var(--vscode-sideBar-background, #f5f5f5);
    flex-shrink: 0;
    height: 36px;
    box-sizing: border-box;
}

.ri-path {
    flex: 1;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px;
    color: var(--vscode-foreground, #333);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ri-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

/* ── Body ── */
.ri-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

/* ── Section ── */
.ri-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.ri-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--vscode-panel-border, #e4e7ed);
}

.ri-section-title {
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--vscode-descriptionForeground, #888);
}

.ri-body-controls {
    display: flex;
    align-items: center;
    gap: 8px;
}

.ri-empty-hint {
    color: var(--vscode-descriptionForeground, #aaa);
    font-size: 12px;
    padding: 8px 0;
}

/* ── Param table ── */
.ri-param-table {
    width: 100%;
}

.ri-param-in-tag {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 3px;
    background: var(--vscode-badge-background, #e0e0e0);
    color: var(--vscode-badge-foreground, #333);
    font-size: 11px;
}

.ri-param-name {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px;
}

.ri-required-tag {
    flex-shrink: 0;
}

/* ── Textarea ── */
.ri-textarea-wrapper {
    width: 100%;
}

.ri-textarea :deep(.el-textarea__inner) {
    font-family: var(--vscode-editor-font-family, monospace) !important;
    font-size: 12px !important;
    resize: vertical;
}

/* ── Form editor ── */
.ri-form-table {
    width: 100%;
}

.ri-form-add {
    margin-top: 6px;
}

/* ── Method badges (reused from RunResultPanel) ── */
.method-badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: 700;
    font-size: 11px;
    text-transform: uppercase;
    flex-shrink: 0;
}

.method-get    { background: #e6f4ff; color: #0070cc; }
.method-post   { background: #e6ffe6; color: #007a29; }
.method-put    { background: #fff3e0; color: #b85c00; }
.method-delete { background: #ffe6e6; color: #cc0000; }
.method-patch  { background: #f0e6ff; color: #6600cc; }
.method-head, .method-options, .method-trace {
    background: var(--vscode-badge-background, #e0e0e0);
    color: var(--vscode-badge-foreground, #333);
}
</style>

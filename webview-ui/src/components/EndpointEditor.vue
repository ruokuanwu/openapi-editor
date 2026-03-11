<template>
    <div class="endpoint-editor" v-if="operation && docStore.selectedPath && docStore.selectedMethod">

        <!-- Outer tabs: Detail | Run -->
        <el-tabs v-model="runStore.activeMainTab" class="outer-tabs">

            <!-- ── Tab 1: Detail (view / edit) ───────────────────────── -->
            <el-tab-pane name="edit">
                <template #label>
                    <span>详情</span>
                </template>

                <!-- Header: method-badge + path + Edit/Save button + Export -->
                <div class="endpoint-header">
                    <div class="endpoint-main">
                        <!-- View mode: non-interactive method badge + path text -->
                        <template v-if="!isEditing">
                            <el-tag :type="methodTagType" class="method-badge" size="small">{{ editMethod.toUpperCase() }}</el-tag>
                            <span class="path-text">{{ editPath }}</span>
                            <el-tag v-if="operation.deprecated" type="warning" size="small">已废弃</el-tag>
                        </template>
                        <!-- Edit mode: method selector + path input -->
                        <template v-else>
                            <el-select v-model="editMethod" size="small" style="width: 110px" @change="onMethodChange">
                                <el-option v-for="m in HTTP_METHODS" :key="m" :label="m.toUpperCase()" :value="m" />
                            </el-select>
                            <el-input v-model="editPath" size="small" style="flex: 1" @blur="onPathBlur" @keydown.enter="onPathBlur" />
                            <el-tag v-if="operation.deprecated" type="warning" size="small">已废弃</el-tag>
                        </template>
                    </div>

                    <div class="endpoint-actions">
                        <el-button v-if="!isEditing" size="small" type="primary" @click="startEditing">编辑</el-button>
                        <template v-else>
                            <el-button size="small" type="success" @click="saveAndExit">保存</el-button>
                            <el-button size="small" type="danger" plain @click="cancelEdit">取消</el-button>
                        </template>

                        <!-- Export split-button (always visible) -->
                        <el-dropdown split-button type="warning" size="small" @click="doExport('curl')" @command="doExport">
                            导出
                            <template #dropdown>
                                <el-dropdown-menu>
                                    <el-dropdown-item command="curl">导出 cURL</el-dropdown-item>
                                    <el-dropdown-item command="openapi">导出 OpenAPI JSON</el-dropdown-item>
                                </el-dropdown-menu>
                            </template>
                        </el-dropdown>
                    </div>
                </div>

                <!-- View mode: human-friendly read-only panel -->
                <div v-if="!isEditing" class="view-content">
                    <EndpointViewPanel :key="docStore.selectedPath + ':' + docStore.selectedMethod" :operation="operation" />
                </div>

                <!-- Edit mode: inner tabs -->
                <el-tabs v-else v-model="activeTab" class="editor-tabs">
                    <el-tab-pane label="概览" name="overview">
                        <EndpointMeta />
                    </el-tab-pane>

                    <el-tab-pane name="params">
                        <template #label>
                            参数
                            <el-badge v-if="(operation.parameters?.length ?? 0) > 0" :value="operation.parameters!.length"
                                class="tab-badge" />
                        </template>
                        <ParameterTable />
                    </el-tab-pane>

                    <el-tab-pane label="请求体" name="requestBody">
                        <RequestBodyEditor />
                    </el-tab-pane>

                    <el-tab-pane name="responses">
                        <template #label>
                            响应
                            <el-badge v-if="responseCount > 0" :value="responseCount" class="tab-badge" />
                        </template>
                        <ResponseEditor />
                    </el-tab-pane>
                </el-tabs>
            </el-tab-pane>

            <!-- ── Tab 2: Run (instance) ─────────────────────────────── -->
            <el-tab-pane name="run">
                <template #label>
                    <span>运行</span>
                </template>
                <div class="run-tab-layout" ref="runTabLayout">
                    <RunInstancePanel class="run-instance-pane" :style="{ width: runPaneWidth + 'px' }" />
                    <div class="run-resizer" @mousedown.prevent="onRunResizerMousedown" />
                    <RunResultPanel class="run-result-pane" />
                </div>
            </el-tab-pane>

        </el-tabs>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, toRaw } from 'vue';
import { ElMessage } from 'element-plus';
import { useDocStore } from '../store/useDocStore';
import { useConfigStore } from '../store/useConfigStore';
import { useRunStore } from '../store/useRunStore';
import { HTTP_METHODS } from '../types';
import type { HttpMethod } from '../types';
import { buildCurl, buildOpenapiJson } from '../utils/exportUtils';
import vscode from '../vscode';
import EndpointMeta from './EndpointMeta.vue';
import ParameterTable from './ParameterTable.vue';
import RequestBodyEditor from './RequestBodyEditor.vue';
import ResponseEditor from './ResponseEditor.vue';
import RunInstancePanel from './RunInstancePanel.vue';
import RunResultPanel from './RunResultPanel.vue';
import EndpointViewPanel from './EndpointViewPanel.vue';

const docStore = useDocStore();
const configStore = useConfigStore();
const runStore = useRunStore();
const activeTab = ref('overview');
const isEditing = ref(false);

// Run tab resizable pane
const runTabLayout = ref<HTMLElement | null>(null);
const runPaneWidth = ref(380);

function onRunResizerMousedown(e: MouseEvent) {
    const startX = e.clientX;
    const startWidth = runPaneWidth.value;

    function onMouseMove(mv: MouseEvent) {
        runPaneWidth.value = Math.min(800, Math.max(200, startWidth + (mv.clientX - startX)));
    }

    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

interface EditSnapshot {
    doc: typeof docStore.doc;
    path: string;
    method: HttpMethod;
}
const preEditSnapshot = ref<EditSnapshot | null>(null);

function startEditing() {
    preEditSnapshot.value = {
        doc: JSON.parse(JSON.stringify(toRaw(docStore.doc))),
        path: docStore.selectedPath ?? '',
        method: (docStore.selectedMethod ?? 'get') as HttpMethod,
    };
    docStore.startEditSession('endpoint');
    docStore.setEditSessionDirty(false);
    isEditing.value = true;
}

function saveAndExit() {
    preEditSnapshot.value = null;
    isEditing.value = false;
    docStore.endEditSession('endpoint');
    vscode.postMessage({ type: 'save', doc: toRaw(docStore.doc) });
}

function cancelEdit() {
    if (preEditSnapshot.value) {
        const snap = preEditSnapshot.value;
        docStore.endEditSession('endpoint');
        docStore.setDoc(snap.doc);
        docStore.selectEndpoint(snap.path, snap.method);
        editPath.value = snap.path;
        editMethod.value = snap.method;
        preEditSnapshot.value = null;
    }
    docStore.endEditSession('endpoint');
    isEditing.value = false;
}

function syncEndpointDirtyState() {
    if (!isEditing.value || !preEditSnapshot.value || !docStore.doc) {
        docStore.setEditSessionDirty(false);
        return;
    }
    const current = JSON.stringify(toRaw(docStore.doc));
    const baseline = JSON.stringify(preEditSnapshot.value.doc);
    docStore.setEditSessionDirty(current !== baseline);
}

const operation = computed(() => docStore.selectedOperation);

// Editable path / method (local copies that sync from store)
const editPath = ref(docStore.selectedPath ?? '');
const editMethod = ref<HttpMethod>(docStore.selectedMethod ?? 'get');

watch(
    [() => docStore.selectedPath, () => docStore.selectedMethod],
    ([path, method]) => {
        editPath.value = path ?? '';
        editMethod.value = (method ?? 'get') as HttpMethod;
        // Reset editing state and run state when switching endpoints
        if (isEditing.value) {
            docStore.endEditSession('endpoint');
            preEditSnapshot.value = null;
        }
        isEditing.value = false;
        runStore.close();
    }
);

watch(
    () => docStore.doc,
    () => {
        syncEndpointDirtyState();
    },
    { deep: true }
);

const responseCount = computed(
    () => Object.keys(operation.value?.responses ?? {}).length
);

function onMethodChange(newMethod: HttpMethod) {
    const oldPath = docStore.selectedPath;
    const oldMethod = docStore.selectedMethod;
    if (oldPath && oldMethod && oldMethod !== newMethod) {
        docStore.renameEndpoint(oldPath, oldMethod, oldPath, newMethod);
    }
}

function onPathBlur() {
    const newPath = editPath.value.trim() || '/';
    const oldPath = docStore.selectedPath;
    const method = docStore.selectedMethod;
    if (oldPath && method && oldPath !== newPath) {
        docStore.renameEndpoint(oldPath, method, newPath.startsWith('/') ? newPath : `/${newPath}`, method);
    }
}

function doRun() {
    const op = operation.value;
    const path = docStore.selectedPath;
    const doc = docStore.doc;
    if (!op || !path || !doc) { return; }

    // Initialize run instance from current operation (deep copy stays independent)
    runStore.initInstance(toRaw(op), path, toRaw(doc));
    runStore.setActiveMainTab('run');
}

function doExport(type: 'curl' | 'openapi') {
    const op = operation.value;
    const path = docStore.selectedPath;
    const method = docStore.selectedMethod;
    const doc = docStore.doc;
    if (!op || !path || !method || !doc) { return; }

    let text: string;
    if (type === 'openapi') {
        text = buildOpenapiJson(path, method, toRaw(doc));
    } else {
        text = buildCurl(toRaw(op), path, method, configStore, toRaw(doc));
    }

    navigator.clipboard.writeText(text).then(() => {
        ElMessage.success('已复制');
    }).catch(() => {
        ElMessage.error('复制失败，请手动复制');
    });
}

const METHOD_COLORS: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    get: 'success',
    post: '',
    put: 'warning',
    delete: 'danger',
    patch: 'warning',
    options: 'info',
    head: 'info',
    trace: 'info',
};

const methodTagType = computed((): '' | 'success' | 'warning' | 'danger' | 'info' =>
    METHOD_COLORS[editMethod.value] ?? ''
);
</script>

<style scoped>
.endpoint-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
}

/* ── Outer tabs ──────────────────────────────────────────────────────── */
.outer-tabs {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

:deep(.outer-tabs > .el-tabs__header) {
    margin-bottom: 0;
    flex-shrink: 0;
}

:deep(.outer-tabs > .el-tabs__content) {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 0;
}

:deep(.outer-tabs > .el-tabs__content > .el-tab-pane) {
    display: flex;
    flex-direction: column;
    height: 100%;
}

/* ── Edit tab pane content ───────────────────────────────────────────── */
.endpoint-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 0 8px;
    flex-shrink: 0;
}

.endpoint-main {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
}

.endpoint-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.method-badge {
    font-weight: 700;
    font-family: monospace;
    min-width: 52px;
    text-align: center;
    flex-shrink: 0;
}

.path-text {
    flex: 1;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 13px;
    color: var(--vscode-foreground, #333);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.view-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 2px;
    min-height: 0;
}

.editor-tabs {
    flex: 1;
    min-height: 0;
}

:deep(.editor-tabs > .el-tabs__content) {
    padding: 0;
    overflow-y: auto;
}

.tab-badge {
    margin-left: 4px;
}

/* ── Run tab pane layout ─────────────────────────────────────────────── */
.run-tab-layout {
    display: flex;
    height: 100%;
    overflow: hidden;
    gap: 0;
}

.run-instance-pane {
    flex-shrink: 0;
    overflow: hidden;
}

.run-result-pane {
    flex: 1;
    min-width: 0;
    overflow: hidden;
}

.run-resizer {
    width: 4px;
    cursor: col-resize;
    background: var(--vscode-panel-border, #e4e7ed);
    flex-shrink: 0;
}

.run-resizer:hover {
    background: var(--vscode-focusBorder, #0078d4);
}

.xrun-resizer {
    /* position: absolute; */

    /* right: 0;
    top: 0;
    bottom: 0; */
    width: 4px;
    cursor: col-resize;
    /* z-index: 10; */
    flex-shrink: 0;
}

.xrun-resizer:hover {
    background: var(--vscode-focusBorder, #0078d4);
    opacity: 0.4;
}

</style>

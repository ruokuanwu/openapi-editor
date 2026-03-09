<template>
    <div class="endpoint-editor" v-if="operation && docStore.selectedPath && docStore.selectedMethod">

        <!-- Outer tabs: Edit | Run -->
        <el-tabs v-model="runStore.activeMainTab" class="outer-tabs">

            <!-- ── Tab 1: Edit (schema template) ─────────────────────── -->
            <el-tab-pane name="edit">
                <template #label>
                    <span>编辑</span>
                </template>

                <!-- Header: method + path + Run button + Export -->
                <div class="endpoint-header">
                    <el-select v-model="editMethod" size="small" style="width: 110px" @change="onMethodChange">
                        <el-option v-for="m in HTTP_METHODS" :key="m" :label="m.toUpperCase()" :value="m" />
                    </el-select>
                    <el-input v-model="editPath" size="small" style="flex: 1" @blur="onPathBlur" @keydown.enter="onPathBlur" />
                    <el-tag v-if="operation.deprecated" type="warning" size="small">已废弃</el-tag>

                    <!-- Run button → switches to Run tab -->
                    <el-button
                        size="small"
                        type="primary"
                        :icon="VideoPlay"
                        @click="doRun"
                    >运行</el-button>

                    <!-- Export split-button -->
                    <el-dropdown split-button size="small" @click="doExport('curl')" @command="doExport">
                        导出
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item command="curl">导出 cURL</el-dropdown-item>
                                <el-dropdown-item command="openapi">导出 OpenAPI JSON</el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                </div>

                <!-- Inner tabs: Overview / Params / RequestBody / Responses -->
                <el-tabs v-model="activeTab" class="editor-tabs">
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
                <div class="run-tab-layout">
                    <RunInstancePanel class="run-instance-pane" />
                    <RunResultPanel class="run-result-pane" />
                </div>
            </el-tab-pane>

        </el-tabs>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, toRaw } from 'vue';
import { VideoPlay } from '@element-plus/icons-vue';
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

const docStore = useDocStore();
const configStore = useConfigStore();
const runStore = useRunStore();
const activeTab = ref('overview');

const operation = computed(() => docStore.selectedOperation);

// Editable path / method (local copies that sync from store)
const editPath = ref(docStore.selectedPath ?? '');
const editMethod = ref<HttpMethod>(docStore.selectedMethod ?? 'get');

watch(
    [() => docStore.selectedPath, () => docStore.selectedMethod],
    ([path, method]) => {
        editPath.value = path ?? '';
        editMethod.value = (method ?? 'get') as HttpMethod;
        // Reset run state when switching endpoints
        runStore.close();
    }
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
    flex: 1;
    min-width: 0;
    overflow: hidden;
}

.run-result-pane {
    width: 380px;
    flex-shrink: 0;
    overflow: hidden;
}
</style>

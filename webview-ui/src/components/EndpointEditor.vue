<template>
    <div class="endpoint-editor" v-if="operation && docStore.selectedPath && docStore.selectedMethod">
        <!-- Header: method + path -->
        <div class="endpoint-header">
            <el-select v-model="editMethod" size="small" style="width: 110px" @change="onMethodChange">
                <el-option v-for="m in HTTP_METHODS" :key="m" :label="m.toUpperCase()" :value="m" />
            </el-select>
            <el-input v-model="editPath" size="small" style="flex: 1" @blur="onPathBlur" @keydown.enter="onPathBlur" />
            <el-tag v-if="operation.deprecated" type="warning" size="small">已废弃</el-tag>

            <!-- Run button -->
            <el-button
                size="small"
                type="primary"
                :icon="VideoPlay"
                :loading="runStore.loading"
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

        <!-- Tabs -->
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
import { buildRunRequest } from '../utils/requestBuilder';
import { buildCurl, buildOpenapiJson } from '../utils/exportUtils';
import vscode from '../vscode';
import EndpointMeta from './EndpointMeta.vue';
import ParameterTable from './ParameterTable.vue';
import RequestBodyEditor from './RequestBodyEditor.vue';
import ResponseEditor from './ResponseEditor.vue';

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
        // Clear run result when switching endpoints
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

async function doRun() {
    const op = operation.value;
    const path = docStore.selectedPath;
    const method = docStore.selectedMethod;
    const doc = docStore.doc;
    if (!op || !path || !method || !doc) { return; }

    const req = buildRunRequest(toRaw(op), path, configStore, toRaw(doc));
    req.method = method.toUpperCase();

    // Generate a unique request ID
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Register the pending request in the store before sending
    runStore.expectResponse(id, req);
    runStore.open();
    runStore.setLoading(true);

    // Proxy the HTTP request through the extension host (CSP doesn't allow direct fetch)
    vscode.postMessage({ type: 'runRequest', id, method: req.method, url: req.url, headers: req.headers, body: req.body });
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

.endpoint-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
}

.editor-tabs {
    flex: 1;
}

.tab-badge {
    margin-left: 4px;
}

:deep(.el-tabs__content) {
    padding: 0;
    overflow-y: auto;
}
</style>

<template>
    <div class="viewer-pane">
        <div class="endpoint-header">
            <div class="endpoint-main">
                <el-tag :type="methodTagType" class="method-badge" size="small">{{
                    docStore.selectedMethod?.toUpperCase() }}</el-tag>
                <span class="path-text">{{ docStore.selectedPath }}</span>
                <el-tag v-if="operation?.deprecated" type="warning" size="small">已废弃</el-tag>
            </div>
            <div class="endpoint-actions">
                <el-button size="small" type="primary" @click="emit('start-edit')">编辑</el-button>
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
        <div v-if="operation" class="view-content">
            <div :key="viewKey">
                <EndpointMetaViewer :operation="operation" />
                <ParameterTableViewer :operation="operation" />
                <RequestBodyViewer :operation="operation" />
                <ResponseViewer :operation="operation" />
                <div v-if="isEmpty" class="empty-hint">此接口暂无详细描述，点击上方「编辑」按钮添加信息。</div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, toRaw } from 'vue';
import { ElMessage } from 'element-plus';
import { useDocStore } from '../store/useDocStore';
import { useConfigStore } from '../store/useConfigStore';
import { buildCurl, buildOpenapiJson } from '../utils/exportUtils';
import { resolveRequestBody } from '../utils/resolve';
import EndpointMetaViewer from './EndpointMetaViewer.vue';
import ParameterTableViewer from './ParameterTableViewer.vue';
import RequestBodyViewer from './RequestBodyViewer.vue';
import ResponseViewer from './ResponseViewer.vue';

const emit = defineEmits<{ 'start-edit': [] }>();
const docStore = useDocStore();
const configStore = useConfigStore();
const operation = computed(() => docStore.selectedOperation);
const viewKey = computed(() => `${docStore.selectedPath}:${docStore.selectedMethod}`);
const _doc = computed(() => docStore.doc);

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
    METHOD_COLORS[docStore.selectedMethod ?? ''] ?? ''
);

const isEmpty = computed(() => {
    const op = operation.value;
    if (!op) { return true; }
    const hasRequestBody = op.requestBody &&
        Object.keys(resolveRequestBody(_doc, op.requestBody)?.content ?? {}).length > 0;
    return !hasRequestBody &&
        !Object.keys(op.responses ?? {}).length &&
        !op.parameters?.length &&
        !op.summary &&
        !op.description;
});

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
.viewer-pane {
    display: flex;
    flex-direction: column;
    height: 100%;
}

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
    padding: 0 2px 32px;
    min-height: 0;
}

.empty-hint {
    margin-top: 40px;
    text-align: center;
    font-size: 13px;
    opacity: 0.5;
}
</style>

<template>
    <div class="run-instance-panel">
        <!-- Top: Method + Path (read-only) + Send button -->
        <div class="ri-header">
            <span :class="['method-badge', `method-${method}`]">{{ method.toUpperCase() }}</span>
            <span class="ri-path">{{ path }}</span>
            <div class="ri-header-actions">
                <el-button type="primary" size="small" :icon="Promotion" :loading="runStore.loading"
                    @click="doSend">发送</el-button>
                <el-button type="warning" size="small" :icon="Download" @click="doExportCurl">导出</el-button>
            </div>
        </div>

        <div class="ri-body">
            <!-- Parameters section -->
            <RunParamTable :parameters="op?.parameters" :doc="docStore.doc ?? null" v-model="localParams" />

            <!-- Request Body section -->
            <div v-if="body !== null" class="ri-section">
                <div class="ri-section-header">
                    <span class="ri-section-title">请求体</span>
                    <div class="ri-body-controls">
                        <!-- Content-Type selector -->
                        <el-select v-model="body.contentType" size="small" style="width: 190px">
                            <el-option v-for="ct in availableContentTypes" :key="ct" :label="ct" :value="ct" />
                            <template v-if="!availableContentTypes.includes(body.contentType)">
                                <el-option :label="body.contentType" :value="body.contentType" />
                            </template>
                        </el-select>
                    </div>
                </div>

                <!-- Text editor -->
                <div class="ri-textarea-wrapper">
                    <el-input v-model="body.textContent" type="textarea" :autosize="{ minRows: 6, maxRows: 20 }"
                        placeholder='{"key": "value"}' class="ri-textarea" />
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
import { computed, ref, watch, toRaw } from 'vue';
import { Promotion, Download, Plus } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useDocStore } from '../store/useDocStore';
import { useConfigStore } from '../store/useConfigStore';
import { useRunStore } from '../store/useRunStore';
import { buildRunRequestFromInstance } from '../utils/requestBuilder';
import { buildCurl } from '../utils/exportUtils';
import vscode from '../vscode';
import type { RunInstanceParam } from '../types';
import { resolveRequestBody } from '../utils/resolve';
import RunParamTable from './RunParamTable.vue';

/**
 * 常用的 Content-Type 类型列表
 */
const COMMON_CONTENT_TYPES = [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain',
];

/**
 * 文档存储
 */
const docStore = useDocStore();

/**
 * 文档数据的计算属性（用于响应式访问）
 */
const _doc = computed(() => docStore.doc);

/**
 * 配置存储
 */
const configStore = useConfigStore();

/**
 * 请求执行存储
 */
const runStore = useRunStore();

/**
 * 当前选中的操作（API 端点）
 */
const op = computed(() => docStore.selectedOperation);

/**
 * HTTP 方法
 */
const method = computed(() => docStore.selectedMethod ?? 'get');

/**
 * API 路径
 */
/**
 * API 路径
 */
const path = computed(() => docStore.selectedPath ?? '');

/** 用户可编辑的参数列表（由 RunParamTable 通过 v-model 维护） */
const localParams = ref<RunInstanceParam[]>([]);

/**
 * 监听选中的操作和文档变化，初始化请求体数据
 */
watch(
    [op, path, () => docStore.doc],
    ([opVal, pathVal, docVal]) => {
        if (opVal && pathVal && docVal) {
            runStore.initInstance(toRaw(opVal), pathVal, toRaw(docVal));
        }
    },
    { immediate: true }
);

/**
 * 请求体的代理访问
 */
const body = computed(() => runStore.instanceBody);

/**
 * 可用的 Content-Type 列表（从 schema 定义和常用类型中获取）
 */
const availableContentTypes = computed(() => {
    const op = docStore.selectedOperation;
    const requestBody = resolveRequestBody(_doc, op?.requestBody);
    const ctFromOp = requestBody?.content ? Object.keys(requestBody.content) : [];
    const combined = [...new Set([...ctFromOp, ...COMMON_CONTENT_TYPES])];
    return combined;
});

/**
 * 为当前接口添加请求体
 */
function addBody() {
    runStore.instanceBody = {
        contentType: 'application/json',
        textContent: '{}',
        formContent: {},
    };
}

/**
 * 发送 HTTP 请求
 * 构建请求并通过 VSCode 消息发送到后端执行
 */
async function doSend() {
    const m = method.value;
    const p = path.value;
    const doc = docStore.doc;
    if (!doc) { return; }

    const req = buildRunRequestFromInstance(
        localParams.value,
        runStore.instanceBody,
        'text',
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

/**
 * 导出当前请求为 cURL 命令并复制到剪贴板
 */
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

.ri-param-type {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 3px;
    background: var(--vscode-badge-background, #e0e0e0);
    color: var(--vscode-badge-foreground, #333);
    font-size: 11px;
    font-family: var(--vscode-editor-font-family, monospace);
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

.method-get {
    background: #e6f4ff;
    color: #0070cc;
}

.method-post {
    background: #e6ffe6;
    color: #007a29;
}

.method-put {
    background: #fff3e0;
    color: #b85c00;
}

.method-delete {
    background: #ffe6e6;
    color: #cc0000;
}

.method-patch {
    background: #f0e6ff;
    color: #6600cc;
}

.method-head,
.method-options,
.method-trace {
    background: var(--vscode-badge-background, #e0e0e0);
    color: var(--vscode-badge-foreground, #333);
}
</style>

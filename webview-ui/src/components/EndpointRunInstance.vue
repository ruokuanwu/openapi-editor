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
                            <el-input v-if="row.isCustom" v-model="row.name" size="small" placeholder="参数名" />
                            <span v-else class="ri-param-name">
                                {{ row.name }}
                                <el-tag v-if="row.required" type="danger" size="small"
                                    class="ri-required-tag">必填</el-tag>
                            </span>
                        </template>
                    </el-table-column>

                    <el-table-column label="类型" width="120">
                        <template #default="{ row }">
                            <el-select v-if="row.isCustom" v-model="row.type" size="small" style="width: 100%">
                                <el-option v-for="type in NormalSchemaObjectTypes" :key="type" :label="type"
                                    :value="type" />
                            </el-select>
                            <span v-else class="ri-param-type">{{ row.type }}</span>
                        </template>
                    </el-table-column>

                    <el-table-column label="值" min-width="130">
                        <template #default="{ row }">
                            <el-input v-model="row.value" size="small" :placeholder="row.description || '参数值'" />
                        </template>
                    </el-table-column>

                    <el-table-column label="" width="40">
                        <template #default="{ $index, row }">
                            <el-button v-if="row.isCustom" size="small" type="danger" text :icon="Delete"
                                @click="removeParam($index)" />
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
import { NormalSchemaObjectTypes } from '@shared/types';
import { resolveRequestBody } from '../utils/resolve';

/**
 * 参数位置类型定义
 */
const PARAM_LOCATIONS: ParameterIn[] = ['query', 'header', 'path', 'cookie'];

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

/**
 * 监听选中的操作和文档变化，初始化实例数据
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


// ========== 计算属性 ==========

/**
 * 参数列表的代理访问
 */
const params = computed(() => runStore.instanceParams);

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
 * 添加自定义参数到参数列表中
 */
function addCustomParam() {
    runStore.instanceParams.push({
        name: '',
        in: 'query',
        required: false,
        description: '',
        value: '',
        isCustom: true,
        type: 'string',
    });
}

/**
 * 从参数列表中移除指定索引的参数
 * @param index - 要移除的参数索引
 */
function removeParam(index: number) {
    runStore.instanceParams.splice(index, 1);
}

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
        runStore.instanceParams,
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

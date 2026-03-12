<template>
    <div class="view-panel" v-if="operation">

        <!-- ── Meta section ──────────────────────────────────────────────── -->
        <div class="meta-section">
            <div class="meta-title-row">
                <span v-if="operation.summary" class="meta-summary">{{ operation.summary }}</span>
                <el-tag v-if="operation.deprecated" type="warning" size="small">已废弃</el-tag>
            </div>
            <div v-if="operation.operationId || operation.tags?.length" class="meta-badges">
                <span v-if="operation.operationId" class="meta-badge-item">
                    <span class="meta-badge-label">ID</span>
                    <code class="meta-code">{{ operation.operationId }}</code>
                </span>
                <span v-if="operation.tags?.length" class="meta-badge-item">
                    <span class="meta-badge-label">Tags</span>
                    <el-tag v-for="tag in operation.tags" :key="tag" size="small" type="info" class="meta-tag">{{ tag }}</el-tag>
                </span>
            </div>
            <div v-if="operation.description" class="meta-description">{{ operation.description }}</div>
        </div>

        <!-- ── Parameters ────────────────────────────────────────────────── -->
        <template v-if="operation.parameters?.length">
            <div class="section-header">
                <div class="section-bar" />
                <span class="section-title">参数</span>
            </div>
            <div class="table-wrap">
                <el-table :data="operation.parameters" stripe size="small" style="width: 100%">
                    <el-table-column label="位置" width="80">
                        <template #default="{ row }">
                            <el-tag size="small" :type="paramTagType(row.in)">{{ row.in }}</el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="名称" min-width="120">
                        <template #default="{ row }">
                            <code class="param-name">{{ row.name }}</code>
                        </template>
                    </el-table-column>
                    <el-table-column label="类型" width="100">
                        <template #default="{ row }">{{ row.schema?.type ?? '-' }}</template>
                    </el-table-column>
                    <el-table-column label="必填" width="60" align="center">
                        <template #default="{ row }">
                            <el-icon v-if="row.required" color="#67c23a"><Check /></el-icon>
                            <span v-else style="opacity:0.4">-</span>
                        </template>
                    </el-table-column>
                    <el-table-column label="描述" min-width="160">
                        <template #default="{ row }">{{ row.description ?? '' }}</template>
                    </el-table-column>
                </el-table>
            </div>
        </template>

        <!-- ── Request Body ──────────────────────────────────────────────── -->
        <template v-if="hasRequestBody">
            <div class="section-header">
                <div class="section-bar" />
                <span class="section-title">请求体</span>
                <el-tag v-if="resolveRequestBody(_doc,operation.requestBody)?.required" size="small" type="danger" class="section-tag">必填</el-tag>
            </div>
            <div v-if="operation.requestBody?.description" class="section-desc">{{ operation.requestBody.description }}</div>

            <div v-for="ct in requestBodyContentTypes" :key="ct" class="content-type-block">
                <div v-if="requestBodySchema(ct)" class="schema-view-card">
                    <div class="schema-view-header">
                        <el-tag size="small">{{ ct }}</el-tag>
                        <el-button-group size="small" class="schema-view-actions">
                            <el-button :type="getReqBodyMode(ct) === 'visual' ? 'primary' : ''"
                                size="small" @click="setReqBodyMode(ct, 'visual')">表格</el-button>
                            <el-button :type="getReqBodyMode(ct) === 'json' ? 'primary' : ''"
                                size="small" @click="setReqBodyMode(ct, 'json')">JSON</el-button>
                        </el-button-group>
                    </div>
                    <div class="schema-view-body">
                        <SchemaEditor v-if="getReqBodyMode(ct) === 'visual'" :schema="requestBodySchema(ct)!" :readonly="true" :level="0" />
                        <pre v-else class="mock-json">{{ JSON.stringify(generateMockData(requestBodySchema(ct)!, docStore.doc), null, 2) }}</pre>
                    </div>
                </div>
            </div>
        </template>

        <!-- ── Responses ─────────────────────────────────────────────────── -->
        <template v-if="Object.keys(operation.responses ?? {}).length">
            <div class="section-header">
                <div class="section-bar" />
                <span class="section-title">响应</span>
            </div>

            <div class="responses-list">
                <el-collapse>
                    <el-collapse-item v-for="(resp, code) in operation.responses" :key="code" :name="code">
                        <template #title>
                            <div class="response-title">
                                <el-tag :type="statusTagType(String(code))" size="small" class="status-code">{{ code }}</el-tag>
                                <span class="response-desc">{{ resp.description }}</span>
                            </div>
                        </template>

                        <div class="response-body">
                            <template v-for="ct in Object.keys(resolveResponse(_doc,resp)?.content ?? {})" :key="ct">
                                <div v-if="resolveResponse(_doc,resp)?.content![ct]?.schema" class="schema-view-card">
                                    <div class="schema-view-header">
                                        <el-tag size="small">{{ ct }}</el-tag>
                                        <el-button-group size="small" class="schema-view-actions">
                                            <el-button :type="getRespMode(String(code), ct) === 'visual' ? 'primary' : ''"
                                                size="small" @click="setRespMode(String(code), ct, 'visual')">表格</el-button>
                                            <el-button :type="getRespMode(String(code), ct) === 'json' ? 'primary' : ''"
                                                size="small" @click="setRespMode(String(code), ct, 'json')">JSON</el-button>
                                        </el-button-group>
                                    </div>
                                    <div class="schema-view-body">
                                        <SchemaEditor v-if="getRespMode(String(code), ct) === 'visual'" :schema="resolveResponse(_doc,resp)?.content![ct].schema!" :readonly="true" :level="0" />
                                        <pre v-else class="mock-json">{{ JSON.stringify(generateMockData(resolveResponse(_doc,resp)?.content![ct].schema!, docStore.doc), null, 2) }}</pre>
                                    </div>
                                </div>
                            </template>

                            <div v-if="!resolveResponse(_doc,resp)?.content || !Object.keys(resolveResponse(_doc,resp)?.content?? {}).length" class="no-content">
                                无响应体
                            </div>
                        </div>
                    </el-collapse-item>
                </el-collapse>
            </div>
        </template>

        <!-- Empty state -->
        <div v-if="!hasRequestBody && !Object.keys(operation.responses ?? {}).length && !operation.parameters?.length && !operation.summary && !operation.description"
            class="empty-hint">此接口暂无详细描述，点击上方「编辑」按钮添加信息。</div>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { Check } from '@element-plus/icons-vue';
import { useDocStore } from '../store/useDocStore';
import type { OperationObject, SchemaObject } from '../types';
import { generateMockData } from '../utils/mockGenerator';
import SchemaEditor from './SchemaEditor.vue';
import { resolveRequestBody,resolveResponse} from '../utils/resolve';

const props = defineProps<{
    operation: OperationObject;
}>();

const docStore = useDocStore();
const _doc = computed(() => docStore.doc);


const operation = computed(() => props.operation);

const hasRequestBody = computed(() => {
    const rb = operation.value.requestBody;
    return rb && Object.keys(resolveRequestBody(_doc,rb)?.content ?? {}).length > 0;
});

const requestBodyContentTypes = computed((): string[] => {
    return Object.keys(resolveRequestBody(_doc,operation.value.requestBody)?.content ?? {});
});

function requestBodySchema(ct: string): SchemaObject | null {
    return resolveRequestBody(_doc,operation.value.requestBody)?.content?.[ct]?.schema ?? null;
}

function paramTagType(loc: string): '' | 'success' | 'warning' | 'danger' | 'info' {
    const map: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
        path: 'danger',
        query: '',
        header: 'warning',
        cookie: 'info',
    };
    return map[loc] ?? '';
}

function statusTagType(code: string): '' | 'success' | 'warning' | 'danger' | 'info' {
    const n = parseInt(code);
    if (n >= 500) { return 'danger'; }
    if (n >= 400) { return 'warning'; }
    if (n >= 200 && n < 300) { return 'success'; }
    return 'info';
}

// ── Schema view mode tracking ────────────────────────────────────────────────
type ViewMode = 'visual' | 'json';
const reqBodyModes = reactive<Record<string, ViewMode>>({});
const respModes = reactive<Record<string, ViewMode>>({});

function getReqBodyMode(ct: string): ViewMode {
    return reqBodyModes[ct] ?? 'visual';
}
function setReqBodyMode(ct: string, mode: ViewMode) {
    reqBodyModes[ct] = mode;
}
function getRespMode(code: string, ct: string): ViewMode {
    return respModes[`${code}_${ct}`] ?? 'visual';
}
function setRespMode(code: string, ct: string, mode: ViewMode) {
    respModes[`${code}_${ct}`] = mode;
}
</script>

<style scoped>
.view-panel {
    padding: 0 0 32px;
    overflow-y: auto;
    height: 100%;
}

/* ── Meta ────────────────────────────────────────────────────────────── */
.meta-section {
    padding: 10px 0 8px;
}

.meta-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.meta-summary {
    font-size: 16px;
    font-weight: 600;
    color: var(--vscode-foreground, #333);
    line-height: 1.3;
}

.meta-badges {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
}

.meta-badge-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
}

.meta-badge-label {
    color: var(--vscode-descriptionForeground, #888);
    font-weight: 500;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
}

.meta-code {
    font-family: 'Consolas', 'Courier New', monospace;
    background: var(--vscode-textCodeBlock-background, #f0f0f0);
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 12px;
    color: var(--vscode-foreground, #333);
}

.meta-tag {
    margin-right: 2px;
}

.meta-description {
    font-size: 13px;
    line-height: 1.65;
    white-space: pre-wrap;
    color: var(--vscode-foreground, #333);
    opacity: 0.8;
    border-left: 3px solid var(--vscode-panel-border, #d0d0d0);
    padding-left: 10px;
    margin-top: 8px;
}

/* ── Section headers ─────────────────────────────────────────────────── */
.section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 18px 0 10px;
}

.section-bar {
    width: 3px;
    height: 14px;
    border-radius: 2px;
    background: var(--el-color-primary, #409eff);
    flex-shrink: 0;
}

.section-title {
    font-weight: 600;
    font-size: 13px;
    color: var(--vscode-foreground, #333);
    letter-spacing: 0.2px;
}

.section-tag {
    margin-left: 2px;
}

.section-desc {
    font-size: 12px;
    opacity: 0.7;
    margin-bottom: 10px;
}

/* ── Param table ─────────────────────────────────────────────────────── */
.table-wrap {
    border: 1px solid var(--vscode-panel-border, #e2e2e2);
    border-radius: 6px;
    overflow: hidden;
}

.param-name {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 12px;
    background: var(--vscode-textCodeBlock-background, #f0f0f0);
    padding: 1px 5px;
    border-radius: 3px;
    color: var(--vscode-foreground, #333);
}

/* ── Schema view card (single-column with toggle) ──────────────────── */
.content-type-block {
    margin-bottom: 18px;
}

.schema-view-card {
    border: 1px solid var(--vscode-panel-border, #e2e2e2);
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 14px;
}

.schema-view-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    background: var(--vscode-sideBar-background, #f7f7f7);
    border-bottom: 1px solid var(--vscode-panel-border, #e2e2e2);
}

.schema-view-actions {
    flex-shrink: 0;
}

.schema-view-body {
    padding: 10px;
}

.mock-json {
    margin: 0;
    padding: 4px 6px;
    font-size: 12px;
    font-family: 'Consolas', 'Courier New', monospace;
    background: transparent;
    overflow-x: auto;
    white-space: pre;
    max-height: 360px;
    overflow-y: auto;
    color: var(--vscode-foreground, #333);
}

/* ── Response list ───────────────────────────────────────────────────── */
.responses-list {
    border: 1px solid var(--vscode-panel-border, #e2e2e2);
    border-radius: 6px;
    overflow: hidden;
}

:deep(.responses-list .el-collapse) {
    border: none;
}

:deep(.responses-list .el-collapse-item__header) {
    padding: 0 12px;
    height: 40px;
    border-bottom: 1px solid var(--vscode-panel-border, #e2e2e2);
}

:deep(.responses-list .el-collapse-item__wrap) {
    border-bottom: 1px solid var(--vscode-panel-border, #e2e2e2);
}

:deep(.responses-list .el-collapse-item:last-child .el-collapse-item__header) {
    border-bottom-color: transparent;
}

:deep(.responses-list .el-collapse-item.is-active:last-child .el-collapse-item__header) {
    border-bottom-color: var(--vscode-panel-border, #e2e2e2);
}

.response-title {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
}

.status-code {
    flex-shrink: 0;
    font-weight: 700;
    font-family: monospace;
}

.response-desc {
    font-size: 12px;
    opacity: 0.8;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.response-body {
    padding: 12px;
}

.no-content {
    font-size: 12px;
    opacity: 0.45;
    padding: 6px 0;
}

.empty-hint {
    margin-top: 40px;
    text-align: center;
    font-size: 13px;
    opacity: 0.5;
}
</style>

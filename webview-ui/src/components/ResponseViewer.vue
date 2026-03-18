<template>
    <template v-if="Object.keys(responses ?? {}).length">
        <div class="section-header">
            <div class="section-bar" />
            <span class="section-title">响应</span>
        </div>

        <div class="responses-list">
            <el-collapse>
                <el-collapse-item v-for="(resp, code) in responses" :key="code" :name="code">
                    <template #title>
                        <div class="response-title">
                            <el-tag type="info" size="small" class="status-code">{{ code
                            }}</el-tag>
                            <span class="response-desc">{{ resp.description }}</span>
                        </div>
                    </template>

                    <div class="response-body">
                        <template v-for="ct in Object.keys(resolveResponse(_doc, resp)?.content ?? {})" :key="ct">
                            <div v-if="resolveResponse(_doc, resp)?.content![ct]?.schema" class="schema-view-card">
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
                                    <SchemaViewer v-if="getRespMode(String(code), ct) === 'visual'"
                                        :schema="resolveResponse(_doc, resp)?.content![ct].schema!" :level="0" />
                                    <pre v-else
                                        class="mock-json">{{ JSON.stringify(generateMockData(resolveResponse(_doc, resp)?.content![ct].schema!, docStore.doc), null, 2) }}</pre>
                                </div>
                            </div>
                        </template>

                        <div v-if="!resolveResponse(_doc, resp)?.content || !Object.keys(resolveResponse(_doc, resp)?.content ?? {}).length"
                            class="no-content">
                            无响应体
                        </div>
                    </div>
                </el-collapse-item>
            </el-collapse>
        </div>
    </template>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useDocStore } from '../store/useDocStore';
import type { ResponsesObject } from '@shared/types';
import { generateMockData } from '../utils/mockGenerator';
import SchemaViewer from './SchemaViewer.vue';
import { resolveResponse } from '../utils/resolve';

const props = defineProps<{
    responses?: ResponsesObject | undefined;
}>();

const docStore = useDocStore();
const _doc = computed(() => docStore.doc);

type ViewMode = 'visual' | 'json';
const respModes = reactive<Record<string, ViewMode>>({});

function getRespMode(code: string, ct: string): ViewMode {
    return respModes[`${code}_${ct}`] ?? 'visual';
}
function setRespMode(code: string, ct: string, mode: ViewMode) {
    respModes[`${code}_${ct}`] = mode;
}
</script>

<style scoped>
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
</style>

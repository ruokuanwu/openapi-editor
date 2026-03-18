<template>
    <template v-if="hasRequestBody">
        <div class="section-header">
            <div class="section-bar" />
            <span class="section-title">请求体</span>
            <el-tag v-if="resolvedRequestBody?.required" size="small" type="danger" class="section-tag">必填</el-tag>
        </div>
        <div v-if="resolvedRequestBody?.description" class="section-desc">
            {{ resolvedRequestBody.description }}
        </div>

        <div v-for="ct in requestBodyContentTypes" :key="ct" class="content-type-block">
            <div v-if="requestBodySchema(ct)" class="schema-view-card">
                <div class="schema-view-header">
                    <el-tag size="small">{{ ct }}</el-tag>
                    <el-button-group size="small" class="schema-view-actions">
                        <el-button :type="getReqBodyMode(ct) === 'visual' ? 'primary' : ''" size="small"
                            @click="setReqBodyMode(ct, 'visual')">表格</el-button>
                        <el-button :type="getReqBodyMode(ct) === 'json' ? 'primary' : ''" size="small"
                            @click="setReqBodyMode(ct, 'json')">JSON</el-button>
                    </el-button-group>
                </div>
                <div class="schema-view-body">
                    <SchemaViewer v-if="getReqBodyMode(ct) === 'visual'" :schema="requestBodySchema(ct)!" :level="0" />
                    <pre v-else
                        class="mock-json">{{ JSON.stringify(generateMockData(requestBodySchema(ct)!, docStore.doc), null, 2) }}</pre>
                </div>
            </div>
        </div>
    </template>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useDocStore } from '../store/useDocStore';
import type { RequestBodyObject, SchemaObject } from '@shared/types';
import { generateMockData } from '../utils/mockGenerator';
import SchemaViewer from './SchemaViewer.vue';
import { resolveSchema } from '../utils/resolve';

const props = defineProps<{
    requestBody: RequestBodyObject;
}>();

const docStore = useDocStore();

const resolvedRequestBody = computed(() => props.requestBody);
const hasRequestBody = computed(() => {
    const rb = props.requestBody;
    return rb && Object.keys(rb.content ?? {}).length > 0;
});
const requestBodyContentTypes = computed((): string[] =>
    Object.keys(resolvedRequestBody.value?.content ?? {})
);

function requestBodySchema(ct: string): SchemaObject | null {
    return resolveSchema(docStore.doc, resolvedRequestBody.value?.content?.[ct]?.schema) ?? null;
}

type ViewMode = 'visual' | 'json';
const reqBodyModes = reactive<Record<string, ViewMode>>({});

function getReqBodyMode(ct: string): ViewMode {
    return reqBodyModes[ct] ?? 'visual';
}
function setReqBodyMode(ct: string, mode: ViewMode) {
    reqBodyModes[ct] = mode;
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

.section-tag {
    margin-left: 2px;
}

.section-desc {
    font-size: 12px;
    opacity: 0.7;
    margin-bottom: 10px;
}

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
</style>

<template>
    <div class="run-param-table">
        <div class="rpt-header">
            <span class="rpt-section-title">参数</span>
            <el-button size="small" text :icon="Plus" @click="addCustomParam">添加自定义参数</el-button>
        </div>

        <div v-if="localParams.length === 0" class="rpt-empty-hint">暂无参数</div>

        <el-table v-else :data="localParams" size="small" class="rpt-table">
            <el-table-column label="位置" width="100">
                <template #default="{ row }">
                    <el-select v-if="row.isCustom" v-model="row.in" size="small" style="width: 100%"
                        @change="emitUpdate">
                        <el-option v-for="loc in PARAM_LOCATIONS" :key="loc" :label="loc" :value="loc" />
                    </el-select>
                    <span v-else class="rpt-param-in-tag">{{ row.in }}</span>
                </template>
            </el-table-column>

            <el-table-column label="名称" min-width="100">
                <template #default="{ row }">
                    <el-input v-if="row.isCustom" v-model="row.name" size="small" placeholder="参数名"
                        @input="emitUpdate" />
                    <span v-else class="rpt-param-name">
                        {{ row.name }}
                        <el-tag v-if="row.required" type="danger" size="small" class="rpt-required-tag">必填</el-tag>
                    </span>
                </template>
            </el-table-column>

            <el-table-column label="类型" width="120">
                <template #default="{ row }">
                    <el-select v-if="row.isCustom" v-model="row.type" size="small" style="width: 100%"
                        @change="emitUpdate">
                        <el-option v-for="type in NormalSchemaObjectTypes" :key="type" :label="type" :value="type" />
                    </el-select>
                    <span v-else class="rpt-param-type">{{ row.type }}</span>
                </template>
            </el-table-column>

            <el-table-column label="描述" min-width="100">
                <template #default="{ row }">
                    <span class="rpt-param-desc">{{ row.description || '' }}</span>
                </template>
            </el-table-column>

            <el-table-column label="值" min-width="130">
                <template #default="{ row }">
                    <el-input v-model="row.value" size="small" :placeholder="row.description || '参数值'"
                        @input="emitUpdate" />
                </template>
            </el-table-column>

            <el-table-column label="" width="40">
                <template #default="{ $index }">
                    <el-button size="small" type="danger" text :icon="Delete" @click="removeParam($index)" />
                </template>
            </el-table-column>
        </el-table>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Plus, Delete } from '@element-plus/icons-vue';
import { NormalSchemaObjectTypes } from '@shared/types';
import type { ParameterObject, OpenApiDoc } from '@shared/types';
import type { RunInstanceParam, ParameterIn } from '../types';
import { resolveParameter, resolveSchema } from '../utils/resolve';
import { generateMockData } from '../utils/mockGenerator';

const PARAM_LOCATIONS: ParameterIn[] = ['query', 'header', 'path', 'cookie'];

const props = defineProps<{
    parameters?: (ParameterObject | { $ref: string })[];
    doc: OpenApiDoc | null;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', v: RunInstanceParam[]): void;
}>();

const localParams = ref<RunInstanceParam[]>([]);

function mockParamValue(schema: ReturnType<typeof resolveSchema>, doc: OpenApiDoc): string {
    if (!schema) { return ''; }
    if (schema.example !== undefined && schema.example !== null) { return String(schema.example); }
    if (schema.default !== undefined && schema.default !== null) { return String(schema.default); }
    const mocked = generateMockData(schema, doc);
    if (mocked === null || mocked === undefined) { return ''; }
    if (typeof mocked === 'object') { return JSON.stringify(mocked); }
    return String(mocked);
}

function buildParams(): RunInstanceParam[] {
    const doc = props.doc;
    if (!doc || !props.parameters) { return []; }
    return props.parameters.map((p): RunInstanceParam => {
        const resolved = resolveParameter(doc, p)!;
        const schema = resolveSchema(doc, resolved?.schema);
        return {
            name: resolved?.name ?? '',
            in: (resolved?.in ?? 'query') as ParameterIn,
            required: resolved?.required ?? false,
            description: resolved?.description ?? '',
            value: mockParamValue(schema, doc),
            isCustom: false,
            type: (schema?.type ?? 'string') as RunInstanceParam['type'],
        };
    });
}

watch(
    [() => props.parameters, () => props.doc],
    () => {
        localParams.value = buildParams();
        emit('update:modelValue', [...localParams.value]);
    },
    { immediate: true, deep: false },
);

function emitUpdate() {
    emit('update:modelValue', [...localParams.value]);
}

function addCustomParam() {
    localParams.value.push({
        name: '',
        in: 'query',
        required: false,
        description: '',
        value: '',
        isCustom: true,
        type: 'string',
    });
    emit('update:modelValue', [...localParams.value]);
}

function removeParam(index: number) {
    localParams.value.splice(index, 1);
    emit('update:modelValue', [...localParams.value]);
}
</script>

<style scoped>
.run-param-table {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.rpt-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--vscode-panel-border, #e4e7ed);
}

.rpt-section-title {
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--vscode-descriptionForeground, #888);
}

.rpt-empty-hint {
    color: var(--vscode-descriptionForeground, #aaa);
    font-size: 12px;
    padding: 8px 0;
}

.rpt-table {
    width: 100%;
}

.rpt-param-in-tag {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 3px;
    background: var(--vscode-badge-background, #e0e0e0);
    color: var(--vscode-badge-foreground, #333);
    font-size: 11px;
}

.rpt-param-type {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 3px;
    background: var(--vscode-badge-background, #e0e0e0);
    color: var(--vscode-badge-foreground, #333);
    font-size: 11px;
    font-family: var(--vscode-editor-font-family, monospace);
}

.rpt-param-name {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px;
}

.rpt-required-tag {
    flex-shrink: 0;
}

.rpt-param-desc {
    font-size: 11px;
    color: var(--vscode-descriptionForeground, #888);
}
</style>

<template>
    <template v-if="availableParameters.length">
        <div class="section-header">
            <div class="section-bar" />
            <span class="section-title">参数</span>
        </div>
        <div class="table-wrap">
            <el-table :data="availableParameters" stripe size="small" style="width: 100%">
                <el-table-column label="位置" width="80">
                    <template #default="{ row }">
                        <el-tag size="small">{{ row.in }}</el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="名称" min-width="120">
                    <template #default="{ row }">
                        <code class="param-name">{{ row.name }}</code>
                    </template>
                </el-table-column>
                <el-table-column label="类型" width="100">
                    <template #default="{ row }">{{ resolveSchema(_doc, row.schema)?.type ?? '-' }}</template>
                </el-table-column>
                <el-table-column label="必填" width="60" align="center">
                    <template #default="{ row }">
                        <el-icon v-if="row.required" color="#67c23a">
                            <Check />
                        </el-icon>
                        <span v-else style="opacity:0.4">-</span>
                    </template>
                </el-table-column>
                <el-table-column label="默认值" min-width="160">
                    <template #default="{ row }">{{ resolveSchema(_doc, row.schema)?.default ?? '' }}</template>
                </el-table-column>
                <el-table-column label="描述" min-width="160">
                    <template #default="{ row }">{{ row.description ?? '' }}</template>
                </el-table-column>
                <el-table-column label="模式" min-width="160">
                    <template #default="{ row }">{{ row.schema ? omit(resolveSchema(_doc, row.schema)!, ['type',
                        'default']) : '' }}</template>
                </el-table-column>
            </el-table>
        </div>
    </template>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Check } from '@element-plus/icons-vue';
import { useDocStore } from '../store/useDocStore';
import type { ParameterObject } from '@shared/types';
import { resolveSchema } from '../utils/resolve';
import { omit } from '../utils/object';

const props = defineProps<{
    parameters?: ParameterObject[];
}>();

const docStore = useDocStore();
const _doc = computed(() => docStore.doc);

const availableParameters = computed(() =>
    props.parameters?.filter(p => p != null) ?? []
);
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
</style>

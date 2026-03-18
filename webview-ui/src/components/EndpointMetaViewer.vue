<template>
    <div class="meta-section"
        v-if="operation.summary || operation.deprecated || operation.operationId || operation.tags?.length || operation.description">
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
                <el-tag v-for="tag in operation.tags" :key="tag" size="small" type="info" class="meta-tag">{{ tag
                }}</el-tag>
            </span>
        </div>
        <div v-if="operation.description" class="meta-description">{{ operation.description }}</div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDocStore } from '../store/useDocStore';

const docStore = useDocStore();
const operation = computed(() => docStore.selectedOperation!);
</script>

<style scoped>
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
</style>

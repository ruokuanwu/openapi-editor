<template>
    <div class="comp-group">
        <!-- Sub-section header -->
        <div class="comp-group-header" @click="collapsed = !collapsed">
            <el-icon class="comp-arrow">
                <ArrowDown v-if="!collapsed" />
                <ArrowRight v-else />
            </el-icon>
            <span class="comp-label">{{ label }}</span>
            <span class="comp-count">{{ names.length }}</span>
            <div class="comp-actions" @click.stop>
                <el-tooltip :content="`新增 ${label}`" placement="top" :show-after="600">
                    <el-icon class="comp-action-btn" @click="$emit('add')">
                        <Plus />
                    </el-icon>
                </el-tooltip>
            </div>
        </div>

        <!-- Items -->
        <div v-show="!collapsed" class="comp-items">
            <div v-if="names.length === 0" class="comp-empty">暂无</div>
            <div v-for="name in names" :key="name"
                class="comp-item"
                :class="{ active: selectedName === name }"
                @click="$emit('select', name)">
                <span class="comp-item-name" :title="name">{{ name }}</span>
                <el-icon class="comp-delete-icon" @click.stop="$emit('remove', name)" title="删除">
                    <Close />
                </el-icon>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Plus, Close, ArrowDown, ArrowRight } from '@element-plus/icons-vue';

defineProps<{
    label: string;
    type: string;
    names: string[];
    selectedName: string | null | undefined;
}>();

defineEmits<{
    add: [];
    select: [name: string];
    remove: [name: string];
}>();

const collapsed = ref(false);
</script>

<style scoped>
.comp-group {
    border-bottom: 1px solid var(--vscode-panel-border, #e4e7ed);
}

.comp-group-header {
    display: flex;
    align-items: center;
    padding: 3px 8px 3px 14px;
    cursor: pointer;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    user-select: none;
    background: var(--vscode-sideBar-background, #f8f9fa);
}

.comp-group-header:hover {
    background: var(--vscode-list-hoverBackground, #e0e0e0);
}

.comp-arrow {
    font-size: 11px;
    flex-shrink: 0;
}

.comp-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0.8;
}

.comp-count {
    font-size: 10px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    padding: 0 5px;
    min-width: 16px;
    text-align: center;
}

.comp-actions {
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.15s;
}

.comp-group-header:hover .comp-actions {
    opacity: 1;
}

.comp-action-btn {
    font-size: 12px;
    padding: 2px;
    border-radius: 3px;
    cursor: pointer;
}

.comp-action-btn:hover {
    background: rgba(0, 0, 0, 0.12);
}

.comp-items {
    background: var(--vscode-sideBar-background, #f8f9fa);
}

.comp-empty {
    padding: 4px 24px;
    font-size: 11px;
    opacity: 0.5;
}

.comp-item {
    display: flex;
    align-items: center;
    padding: 3px 8px 3px 24px;
    cursor: pointer;
    font-size: 12px;
    gap: 4px;
}

.comp-item:hover {
    background: var(--vscode-list-hoverBackground, #e5e5e5);
}

.comp-item.active {
    background: var(--vscode-list-activeSelectionBackground, #0078d4);
    color: var(--vscode-list-activeSelectionForeground, #fff);
}

.comp-item-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.comp-delete-icon {
    font-size: 11px;
    opacity: 0;
    color: inherit;
    flex-shrink: 0;
}

.comp-item:hover .comp-delete-icon {
    opacity: 0.5;
}

.comp-item:hover .comp-delete-icon:hover {
    opacity: 1;
    color: #f93e3e;
}
</style>

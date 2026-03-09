<template>
    <header class="toolbar">
        <div class="toolbar-left">
            <span class="toolbar-title">
                <el-icon class="toolbar-icon">
                    <Document />
                </el-icon>
                {{ title }}
            </span>
            <el-tag v-if="docStore.doc?.openapi" size="small" type="info" style="margin-left:8px">
                OpenAPI {{ docStore.doc.openapi }}
            </el-tag>
        </div>
        <div class="toolbar-right">
            <el-select v-if="configStore.config.environments.length" v-model="activeEnv" placeholder="选择环境" size="small"
                style="width: 140px; margin-right: 8px">
                <el-option v-for="env in configStore.config.environments" :key="env.id" :label="env.name"
                    :value="env.id" />
            </el-select>

            <el-button size="small" @click="save" type="primary" :icon="Check">
                保存
            </el-button>
            <el-button size="small" @click="emit('openSettings')" :icon="Setting">
                设置
            </el-button>
        </div>
    </header>
</template>

<script setup lang="ts">
import { computed, toRaw } from 'vue';
import { Check, Setting, Document } from '@element-plus/icons-vue';
import { useDocStore } from '../store/useDocStore';
import { useConfigStore } from '../store/useConfigStore';
import vscode from '../vscode';

const emit = defineEmits<{ (e: 'openSettings'): void }>();

const docStore = useDocStore();
const configStore = useConfigStore();

const title = computed(() => docStore.doc?.info?.title ?? 'OpenAPI Editor');

const activeEnv = computed({
    get: () => configStore.config.activeEnvironment ?? '',
    set: (id: string) => {
        configStore.setActiveEnvironment(id || undefined);
        vscode.postMessage({ type: 'updateConfig', config: { activeEnvironment: id || undefined } });
    },
});

function save() {
    console.log('Saving document...', docStore.doc);
    console.log('Current configuration:', configStore.config);
    if (docStore.doc) {
        vscode.postMessage({ type: 'save', doc : toRaw(docStore.doc) });
    }
}
</script>

<style scoped>
.toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    border-bottom: 1px solid var(--vscode-panel-border, #e4e7ed);
    background: var(--vscode-sideBar-background, #f5f5f5);
    flex-shrink: 0;
    height: 40px;
}

.toolbar-left {
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 600;
    font-size: 13px;
}

.toolbar-icon {
    margin-right: 4px;
    opacity: 0.7;
}

.toolbar-right {
    display: flex;
    align-items: center;
    gap: 6px;
}
</style>

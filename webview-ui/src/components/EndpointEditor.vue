<template>
    <div class="endpoint-editor" v-if="operation && docStore.selectedPath && docStore.selectedMethod">
        <!-- Header: method + path -->
        <div class="endpoint-header">
            <el-select v-model="editMethod" size="small" style="width: 110px" @change="onMethodChange">
                <el-option v-for="m in HTTP_METHODS" :key="m" :label="m.toUpperCase()" :value="m" />
            </el-select>
            <el-input v-model="editPath" size="small" style="flex: 1" @blur="onPathBlur" @keydown.enter="onPathBlur" />
            <el-tag v-if="operation.deprecated" type="warning" size="small">已废弃</el-tag>
        </div>

        <!-- Tabs -->
        <el-tabs v-model="activeTab" class="editor-tabs">
            <el-tab-pane label="概览" name="overview">
                <EndpointMeta />
            </el-tab-pane>

            <el-tab-pane name="params">
                <template #label>
                    参数
                    <el-badge v-if="(operation.parameters?.length ?? 0) > 0" :value="operation.parameters!.length"
                        class="tab-badge" />
                </template>
                <ParameterTable />
            </el-tab-pane>

            <el-tab-pane label="请求体" name="requestBody">
                <RequestBodyEditor />
            </el-tab-pane>

            <el-tab-pane name="responses">
                <template #label>
                    响应
                    <el-badge v-if="responseCount > 0" :value="responseCount" class="tab-badge" />
                </template>
                <ResponseEditor />
            </el-tab-pane>
        </el-tabs>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useDocStore } from '../store/useDocStore';
import { HTTP_METHODS } from '../types';
import type { HttpMethod } from '../types';
import EndpointMeta from './EndpointMeta.vue';
import ParameterTable from './ParameterTable.vue';
import RequestBodyEditor from './RequestBodyEditor.vue';
import ResponseEditor from './ResponseEditor.vue';

const docStore = useDocStore();
const activeTab = ref('overview');

const operation = computed(() => docStore.selectedOperation);

// Editable path / method (local copies that sync from store)
const editPath = ref(docStore.selectedPath ?? '');
const editMethod = ref<HttpMethod>(docStore.selectedMethod ?? 'get');

watch(
    [() => docStore.selectedPath, () => docStore.selectedMethod],
    ([path, method]) => {
        editPath.value = path ?? '';
        editMethod.value = (method ?? 'get') as HttpMethod;
    }
);

const responseCount = computed(
    () => Object.keys(operation.value?.responses ?? {}).length
);

function onMethodChange(newMethod: HttpMethod) {
    const oldPath = docStore.selectedPath;
    const oldMethod = docStore.selectedMethod;
    if (oldPath && oldMethod && oldMethod !== newMethod) {
        docStore.renameEndpoint(oldPath, oldMethod, oldPath, newMethod);
    }
}

function onPathBlur() {
    const newPath = editPath.value.trim() || '/';
    const oldPath = docStore.selectedPath;
    const method = docStore.selectedMethod;
    if (oldPath && method && oldPath !== newPath) {
        docStore.renameEndpoint(oldPath, method, newPath.startsWith('/') ? newPath : `/${newPath}`, method);
    }
}
</script>

<style scoped>
.endpoint-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.endpoint-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
}

.editor-tabs {
    flex: 1;
}

.tab-badge {
    margin-left: 4px;
}

:deep(.el-tabs__content) {
    padding: 0;
    overflow-y: auto;
}
</style>

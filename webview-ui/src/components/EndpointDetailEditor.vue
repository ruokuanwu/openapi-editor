<template>
    <div class="editor-pane">
        <div class="endpoint-header">
            <div class="endpoint-main">
                <el-select v-model="editMethod" size="small" style="width: 110px" @change="onMethodChange">
                    <el-option v-for="m in HTTP_METHODS" :key="m" :label="m.toUpperCase()" :value="m" />
                </el-select>
                <el-input v-model="editPath" size="small" style="flex: 1" @blur="onPathBlur"
                    @keydown.enter="onPathBlur" />
                <el-tag v-if="operation?.deprecated" type="warning" size="small">已废弃</el-tag>
            </div>
            <div class="endpoint-actions">
                <el-button size="small" type="success" @click="emit('save')">保存</el-button>
                <el-button size="small" type="danger" plain @click="emit('cancel')">取消</el-button>
                <el-dropdown split-button type="warning" size="small" @click="doExport('curl')" @command="doExport">
                    导出
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item command="curl">导出 cURL</el-dropdown-item>
                            <el-dropdown-item command="openapi">导出 OpenAPI JSON</el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
            </div>
        </div>

        <el-tabs v-model="activeTab" class="editor-tabs">
            <el-tab-pane label="概览" name="overview">
                <EndpointMetaEditor />
            </el-tab-pane>

            <el-tab-pane name="params">
                <template #label>
                    参数
                    <el-badge v-if="(operation?.parameters?.length ?? 0) > 0" :value="operation!.parameters!.length"
                        class="tab-badge" />
                </template>
                <ParameterTableEditor />
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
import { ref, computed, toRaw } from 'vue';
import { ElMessage } from 'element-plus';
import { useDocStore } from '../store/useDocStore';
import { useConfigStore } from '../store/useConfigStore';
import { HTTP_METHODS } from '../types';
import type { HttpMethod } from '../types';
import { buildCurl, buildOpenapiJson } from '../utils/exportUtils';
import EndpointMetaEditor from './EndpointMetaEditor.vue';
import ParameterTableEditor from './ParameterTableEditor.vue';
import RequestBodyEditor from './RequestBodyEditor.vue';
import ResponseEditor from './ResponseEditor.vue';

const emit = defineEmits<{ save: []; cancel: [] }>();
const docStore = useDocStore();
const configStore = useConfigStore();
const activeTab = ref('overview');
const operation = computed(() => docStore.selectedOperation);
const responseCount = computed(() => Object.keys(operation.value?.responses ?? {}).length);

// editPath and editMethod are initialized from the store at mount time.
// This component is only rendered in edit mode (v-else in parent), so it is
// recreated fresh each time the user enters edit mode — no watchers needed.
const editPath = ref(docStore.selectedPath ?? '');
const editMethod = ref<HttpMethod>((docStore.selectedMethod ?? 'get') as HttpMethod);


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

function doExport(type: 'curl' | 'openapi') {
    const op = operation.value;
    const path = docStore.selectedPath;
    const method = docStore.selectedMethod;
    const doc = docStore.doc;
    if (!op || !path || !method || !doc) { return; }

    let text: string;
    if (type === 'openapi') {
        text = buildOpenapiJson(path, method, toRaw(doc));
    } else {
        text = buildCurl(toRaw(op), path, method, configStore, toRaw(doc));
    }

    navigator.clipboard.writeText(text).then(() => {
        ElMessage.success('已复制');
    }).catch(() => {
        ElMessage.error('复制失败，请手动复制');
    });
}
</script>

<style scoped>
.editor-pane {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.endpoint-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 0 8px;
    flex-shrink: 0;
}

.endpoint-main {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
}

.endpoint-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.editor-tabs {
    flex: 1;
    min-height: 0;
}

:deep(.editor-tabs > .el-tabs__content) {
    padding: 0;
    overflow-y: auto;
}

.tab-badge {
    margin-left: 4px;
}
</style>

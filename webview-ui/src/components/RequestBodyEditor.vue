<template>
    <div class="request-body-editor">
        <template v-if="op">
            <!-- Required toggle -->
            <el-form-item label="必填" label-width="60px">
                <el-switch v-model="requestBody.required" :active-value="true" :inactive-value="false" />
            </el-form-item>

            <!-- Description -->
            <el-form-item label="描述" label-width="60px">
                <el-input v-model="requestBody.description" placeholder="请求体说明" size="small" />
            </el-form-item>

            <!-- Content-Type tabs -->
            <div class="content-type-bar">
                <el-radio-group v-model="activeContentType" size="small">
                    <el-radio-button v-for="ct in contentTypes" :key="ct" :value="ct">
                        {{ ct }}
                    </el-radio-button>
                </el-radio-group>
                <el-button size="small" :icon="Plus" @click="showAddContentType = true" />
                <el-button v-if="contentTypes.length > 0" size="small" type="danger" text :icon="Delete"
                    @click="removeContentType" />
            </div>

            <!-- No content type yet -->
            <div v-if="contentTypes.length === 0" class="no-body">
                <el-button :icon="Plus" @click="showAddContentType = true">添加 Content-Type</el-button>
            </div>

            <!-- Schema editor for active content type -->
            <div v-else-if="activeSchema" class="schema-section">
                <div class="schema-section-title">Schema</div>
                <SchemaEditor :schema="activeSchema" />
            </div>
            <div v-else class="no-body">该 Content-Type 暂无 Schema</div>
        </template>

        <el-empty v-else description="请先选择一个接口" :image-size="60" />

        <!-- Add Content-Type dialog -->
        <el-dialog v-model="showAddContentType" title="添加 Content-Type" width="380px" :append-to-body="true">
            <el-radio-group v-model="newContentType" style="display: flex; flex-direction: column; gap: 8px">
                <el-radio v-for="ct in COMMON_CONTENT_TYPES" :key="ct" :value="ct">
                    {{ ct }}
                </el-radio>
            </el-radio-group>
            <el-input v-model="customContentType" placeholder="自定义 Content-Type" size="small" style="margin-top: 12px"
                @keydown.enter="confirmAddContentType" />
            <template #footer>
                <el-button @click="showAddContentType = false">取消</el-button>
                <el-button type="primary" @click="confirmAddContentType">确定</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus, Delete } from '@element-plus/icons-vue';
import { useDocStore } from '../store/useDocStore';
import SchemaEditor from './SchemaEditor.vue';
import type { SchemaObject } from '../types';

const COMMON_CONTENT_TYPES = [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain',
];

const docStore = useDocStore();

const op = computed(() => docStore.selectedOperation);

const requestBody = computed(() => {
    if (!op.value) { return null; }
    if (!op.value.requestBody) {
        op.value.requestBody = { content: {}, required: false };
    }
    return op.value.requestBody;
});

const contentTypes = computed((): string[] => {
    if (!requestBody.value) { return []; }
    return Object.keys(requestBody.value.content);
});

const activeContentType = ref('application/json');

const activeSchema = computed((): SchemaObject | null => {
    if (!requestBody.value || !activeContentType.value) { return null; }
    const mediaType = requestBody.value.content[activeContentType.value];
    if (!mediaType) { return null; }
    if (!mediaType.schema) { mediaType.schema = { type: 'object', properties: {} }; }
    return mediaType.schema;
});

// Add content type
const showAddContentType = ref(false);
const newContentType = ref('application/json');
const customContentType = ref('');

function confirmAddContentType() {
    const ct = customContentType.value.trim() || newContentType.value;
    if (!ct || !requestBody.value) { return; }
    if (!requestBody.value.content[ct]) {
        requestBody.value.content[ct] = { schema: { type: 'object', properties: {} } };
    }
    activeContentType.value = ct;
    customContentType.value = '';
    showAddContentType.value = false;
}

function removeContentType() {
    if (!requestBody.value || !activeContentType.value) { return; }
    delete requestBody.value.content[activeContentType.value];
    activeContentType.value = contentTypes.value[0] ?? '';
}
</script>

<style scoped>
.request-body-editor {
    padding: 4px 0;
}

.content-type-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 12px 0 10px;
    flex-wrap: wrap;
}

.schema-section-title {
    font-weight: 600;
    margin-bottom: 8px;
    font-size: 12px;
    opacity: 0.8;
}

.schema-section {
    margin-top: 4px;
}

.no-body {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    opacity: 0.7;
    font-size: 13px;
}
</style>

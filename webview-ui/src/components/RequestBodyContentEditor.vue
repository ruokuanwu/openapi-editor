<template>
    <div class="rbce">
        <!-- Content-Type tabs -->
        <div class="content-type-bar">
            <el-radio-group v-model="activeContentType" size="small">
                <el-radio-button v-for="ct in contentTypes" :key="ct" :value="ct">{{ ct }}</el-radio-button>
            </el-radio-group>
            <el-button size="small" :icon="Plus" plain @click="showAdd = true" />
            <el-button v-if="contentTypes.length > 0" size="small" type="danger" text :icon="Delete"
                @click="removeCurrentCT" />
        </div>

        <div v-if="contentTypes.length === 0" class="no-content">
            <el-button :icon="Plus" @click="showAdd = true">添加 Content-Type</el-button>
        </div>

        <div v-else-if="activeSchema">
            <div class="schema-section-title-row">
                <span class="schema-section-title">Schema</span>
                <el-button-group size="small">
                    <el-button :type="schemaViewMode === 'visual' ? 'primary' : ''" size="small"
                        @click="schemaViewMode = 'visual'">表格</el-button>
                    <el-button :type="schemaViewMode === 'json' ? 'primary' : ''" size="small"
                        @click="schemaViewMode = 'json'">JSON</el-button>
                </el-button-group>
            </div>
            <SchemaViewer v-if="schemaViewMode === 'visual' && isReferenceObject(activeSchema)"
                :schema="activeSchema!" />
            <SchemaEditor v-else-if="schemaViewMode === 'visual' && activeSchema" :schema="activeSchema" />
            <pre v-else
                class="mock-json">{{ JSON.stringify(generateMockData(activeSchema!, docStore.doc), null, 2) }}</pre>
        </div>

        <!-- Add CT dialog -->
        <el-dialog v-model="showAdd" title="添加 Content-Type" width="380px" :append-to-body="true">
            <el-radio-group v-model="newCT" style="display:flex;flex-direction:column;gap:8px">
                <el-radio v-for="ct in COMMON" :key="ct" :value="ct">{{ ct }}</el-radio>
            </el-radio-group>
            <el-input v-model="customCT" placeholder="自定义" size="small" style="margin-top:12px"
                @keydown.enter="confirmAdd" />
            <template #footer>
                <el-button @click="showAdd = false">取消</el-button>
                <el-button type="primary" @click="confirmAdd">确定</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Plus, Delete } from '@element-plus/icons-vue';
import SchemaEditor from './SchemaEditor.vue';
import SchemaViewer from './SchemaViewer.vue';
import type { RequestBodyObject, SchemaObject } from '../types';
import { isReferenceObject } from '../utils/resolve';
import { useDocStore } from '../store/useDocStore';
import { generateMockData } from '../utils/mockGenerator';

const COMMON = ['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'];

const props = defineProps<{ requestBody: RequestBodyObject }>();

const docStore = useDocStore();
const schemaViewMode = ref<'visual' | 'json'>('visual');

const activeContentType = ref('');
const showAdd = ref(false);
const newCT = ref('application/json');
const customCT = ref('');

const contentTypes = computed((): string[] => Object.keys(props.requestBody.content ?? {}));

const activeSchema = computed((): SchemaObject | null => {
    if (!activeContentType.value || !props.requestBody.content) { return null; }
    const mt = props.requestBody.content[activeContentType.value];
    if (!mt) { return null; }
    if (!mt.schema) { mt.schema = { type: 'object', properties: {} }; }
    return mt.schema;
});

watch(activeContentType, () => { schemaViewMode.value = 'visual'; });

function removeCurrentCT() {
    if (!props.requestBody.content || !activeContentType.value) { return; }
    delete props.requestBody.content[activeContentType.value];
    activeContentType.value = contentTypes.value[0] ?? '';
}

function confirmAdd() {
    const ct = customCT.value.trim() || newCT.value;
    if (!ct) { return; }
    if (!props.requestBody.content[ct]) {
        props.requestBody.content[ct] = { schema: { type: 'object', properties: {} } };
    }
    activeContentType.value = ct;
    customCT.value = '';
    showAdd.value = false;
}
</script>

<style scoped>
.content-type-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
    flex-wrap: wrap;
}

.schema-section-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}

.schema-section-title {
    font-weight: 600;
    font-size: 12px;
    opacity: 0.8;
}

.mock-json {
    margin: 0;
    padding: 8px 10px;
    font-size: 12px;
    font-family: 'Consolas', 'Courier New', monospace;
    background: var(--vscode-textCodeBlock-background, #f5f5f5);
    border-radius: 4px;
    overflow-x: auto;
    white-space: pre;
    max-height: 400px;
    overflow-y: auto;
    color: var(--vscode-foreground, #333);
}

.no-content {
    padding: 16px;
    text-align: center;
    opacity: 0.7;
}
</style>

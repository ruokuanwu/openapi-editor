<template>
    <div class="rbe">
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
            <div class="schema-section-title">Schema</div>
            <SchemaEditor :schema="activeSchema" />
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
import { ref, computed } from 'vue';
import { Plus, Delete } from '@element-plus/icons-vue';
import SchemaEditor from './SchemaEditor.vue';
import type { ResponseObject, SchemaObject } from '@shared/types';

const COMMON = ['application/json', 'application/xml', 'text/plain'];

const props = defineProps<{ response: ResponseObject }>();

const activeContentType = ref('');
const showAdd = ref(false);
const newCT = ref('application/json');
const customCT = ref('');

const contentTypes = computed((): string[] => Object.keys(props.response.content ?? {}));

const activeSchema = computed((): SchemaObject | null => {
    if (!activeContentType.value || !props.response.content) { return null; }
    const mt = props.response.content[activeContentType.value];
    if (!mt) { return null; }
    if (!mt.schema) { mt.schema = { type: 'object', properties: {} }; }
    return mt.schema;
});

function removeCurrentCT() {
    if (!props.response.content || !activeContentType.value) { return; }
    delete props.response.content[activeContentType.value];
    activeContentType.value = contentTypes.value[0] ?? '';
}

function confirmAdd() {
    const ct = customCT.value.trim() || newCT.value;
    if (!ct) { return; }
    if (!props.response.content) { (props.response as ResponseObject).content = {}; }
    if (!props.response.content![ct]) {
        props.response.content![ct] = { schema: { type: 'object', properties: {} } };
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

.schema-section-title {
    font-weight: 600;
    font-size: 12px;
    opacity: 0.8;
    margin-bottom: 8px;
}

.no-content {
    padding: 16px;
    text-align: center;
    opacity: 0.7;
}
</style>

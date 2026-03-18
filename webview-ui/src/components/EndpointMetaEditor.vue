<template>
    <div class="endpoint-meta" v-if="op">
        <el-form :model="op" label-width="80px" label-position="left">
            <el-form-item label="摘要">
                <el-input v-model="op.summary" placeholder="简短描述此接口" />
            </el-form-item>

            <el-form-item label="操作 ID">
                <el-input v-model="op.operationId" placeholder="唯一标识符 (camelCase)" />
            </el-form-item>

            <el-form-item label="Tags">
                <el-select v-model="op.tags" multiple filterable allow-create default-first-option
                    placeholder="选择或输入 Tag" style="width: 100%" @change="syncNewTags">
                    <el-option v-for="tag in docStore.allTags" :key="tag" :label="tag" :value="tag" />
                </el-select>
            </el-form-item>

            <el-form-item label="已废弃">
                <el-switch v-model="op.deprecated" />
            </el-form-item>

            <el-form-item label="描述">
                <el-input v-model="op.description" type="textarea" :rows="4" placeholder="支持 Markdown 格式" />
            </el-form-item>
        </el-form>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDocStore } from '../store/useDocStore';
import { OperationObject } from '@shared/types';

const props = defineProps<{
    operation?: OperationObject | null;
}>();

const op = computed(() => props.operation);
const docStore = useDocStore();


// When user creates a new tag via the select, register it in doc.tags
function syncNewTags(selectedTags: string[]) {
    for (const tag of selectedTags) {
        if (!docStore.allTags.includes(tag)) {
            docStore.addTag({ name: tag });
        }
    }
}
</script>

<style scoped>
.endpoint-meta {
    padding: 4px 0;
}
</style>

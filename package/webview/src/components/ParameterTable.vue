<template>
    <div class="param-table">
        <div class="param-toolbar">
            <el-button size="small" :icon="Plus" type="primary" plain @click="addParam">
                添加参数
            </el-button>
        </div>

        <el-empty v-if="!params.length" description="暂无参数" :image-size="60" />

        <el-table v-else :data="params" border size="small" style="width: 100%">
            <el-table-column label="位置" width="100">
                <template #default="{ row }">
                    <el-select v-model="row.in" size="small" style="width: 100%">
                        <el-option label="query" value="query" />
                        <el-option label="path" value="path" />
                        <el-option label="header" value="header" />
                        <el-option label="cookie" value="cookie" />
                    </el-select>
                </template>
            </el-table-column>

            <el-table-column label="名称" min-width="120">
                <template #default="{ row }">
                    <el-input v-model="row.name" size="small" placeholder="参数名" />
                </template>
            </el-table-column>

            <el-table-column label="类型" width="110">
                <template #default="{ row }">
                    <el-select v-model="row.schema!.type" size="small" style="width: 100%">
                        <el-option v-for="t in SCHEMA_TYPES" :key="t" :label="t" :value="t" />
                    </el-select>
                </template>
            </el-table-column>

            <el-table-column label="必填" width="60" align="center">
                <template #default="{ row }">
                    <el-checkbox v-model="row.required" />
                </template>
            </el-table-column>

            <el-table-column label="描述" min-width="160">
                <template #default="{ row }">
                    <el-input v-model="row.description" size="small" placeholder="说明" />
                </template>
            </el-table-column>

            <el-table-column label="" width="44" align="center">
                <template #default="{ $index }">
                    <el-button size="small" type="danger" text :icon="Delete" @click="removeParam($index)" />
                </template>
            </el-table-column>
        </el-table>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Plus, Delete } from '@element-plus/icons-vue';
import { useDocStore } from '../store/useDocStore';
import type { ParameterObject } from '../types';

const SCHEMA_TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'object'];

const docStore = useDocStore();

const params = computed((): ParameterObject[] => {
    const op = docStore.selectedOperation;
    if (!op) { return []; }
    if (!op.parameters) { op.parameters = []; }
    return op.parameters as ParameterObject[];
});

function addParam() {
    const op = docStore.selectedOperation;
    if (!op) { return; }
    if (!op.parameters) { op.parameters = []; }
    op.parameters.push({
        name: '',
        in: 'query',
        required: false,
        description: '',
        schema: { type: 'string' },
    });
}

function removeParam(index: number) {
    const op = docStore.selectedOperation;
    if (!op?.parameters) { return; }
    op.parameters.splice(index, 1);
}
</script>

<style scoped>
.param-table {
    padding: 4px 0;
}

.param-toolbar {
    margin-bottom: 8px;
}
</style>

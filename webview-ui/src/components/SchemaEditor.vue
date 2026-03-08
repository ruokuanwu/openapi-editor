<template>
    <div class="schema-editor">
        <!-- $ref: display only -->
        <div v-if="schema.$ref" class="schema-ref">
            <el-tag type="info">$ref: {{ schema.$ref }}</el-tag>
        </div>

        <!-- Object / base schema -->
        <template v-else>
            <!-- Properties table -->
            <el-table v-if="schema.type === 'object' || schema.properties" :data="propertyRows" border size="small"
                style="width: 100%">
                <el-table-column :label="level > 0 ? undefined : '属性名'" min-width="130">
                    <template #header v-if="level === 0">属性名</template>
                    <template #default="{ row }">
                        <el-input v-model="row.name" size="small" @blur="renameProperty(row)" />
                    </template>
                </el-table-column>

                <el-table-column label="类型" width="110">
                    <template #default="{ row }">
                        <el-select v-model="row.schema.type" size="small" style="width: 100%">
                            <el-option v-for="t in SCHEMA_TYPES" :key="t" :label="t" :value="t" />
                        </el-select>
                    </template>
                </el-table-column>

                <el-table-column label="格式" width="100">
                    <template #default="{ row }">
                        <el-input v-model="row.schema.format" size="small" placeholder="e.g. date-time" />
                    </template>
                </el-table-column>

                <el-table-column label="必填" width="58" align="center">
                    <template #default="{ row }">
                        <el-checkbox :model-value="isRequired(row.name)"
                            @change="(v: boolean) => setRequired(row.name, v)" />
                    </template>
                </el-table-column>

                <el-table-column label="描述" min-width="140">
                    <template #default="{ row }">
                        <el-input v-model="row.schema.description" size="small" placeholder="说明" />
                    </template>
                </el-table-column>

                <!-- Expand nested object -->
                <el-table-column label="" width="44" align="center">
                    <template #default="{ row, $index }">
                        <el-button v-if="row.schema.type === 'object'" size="small" text
                            :icon="expanded[$index] ? ArrowDown : ArrowRight"
                            @click="expanded[$index] = !expanded[$index]" />
                        <el-button v-else size="small" type="danger" text :icon="Delete"
                            @click="removeProperty(row.name)" />
                    </template>
                </el-table-column>

                <!-- Nested SchemaEditor row -->
                <template #append>
                    <template v-for="(row, idx) in propertyRows" :key="`nested-${row.name}`">
                        <tr v-if="row.schema.type === 'object' && expanded[idx]">
                            <td :colspan="6" style="padding: 0 0 0 32px; background: #fafafa;">
                                <SchemaEditor :schema="row.schema" :level="level + 1" />
                            </td>
                        </tr>
                        <tr v-if="row.schema.type === 'array' && expanded[idx]">
                            <td :colspan="6" style="padding: 8px 0 8px 32px; background: #fafafa;">
                                <div style="font-size:12px; margin-bottom: 4px; opacity: 0.7">数组项 (items):</div>
                                <SchemaEditor :schema="ensureItems(row.schema)" :level="level + 1" />
                            </td>
                        </tr>
                    </template>
                </template>
            </el-table>

            <!-- Non-object / non-array leaf schema fields -->
            <template v-if="schema.type !== 'object' && !schema.properties">
                <el-form :model="schema" label-width="70px" label-position="left" size="small">
                    <el-form-item label="类型">
                        <el-select v-model="schema.type" style="width: 120px">
                            <el-option v-for="t in SCHEMA_TYPES" :key="t" :label="t" :value="t" />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="格式">
                        <el-input v-model="schema.format" placeholder="e.g. date-time, int64" style="width: 180px" />
                    </el-form-item>
                    <el-form-item label="描述">
                        <el-input v-model="schema.description" placeholder="说明" />
                    </el-form-item>
                </el-form>
            </template>

            <!-- Add property button (only for object schemas) -->
            <div v-if="schema.type === 'object' || schema.properties" class="add-prop">
                <el-button size="small" :icon="Plus" plain @click="addProperty">
                    添加属性
                </el-button>
            </div>

            <!-- Convert to object button -->
            <div v-if="!schema.type || schema.type === 'object'" class="add-prop">
                <el-button v-if="schema.type !== 'object'" size="small" plain @click="schema.type = 'object'">
                    转为对象类型
                </el-button>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { Plus, Delete, ArrowDown, ArrowRight } from '@element-plus/icons-vue';
import type { SchemaObject } from '../types';

const SCHEMA_TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'object'];

const props = defineProps<{
    schema: SchemaObject;
    level?: number;
}>();

const level = computed(() => props.level ?? 0);

// Expand state per row index
const expanded = reactive<Record<number, boolean>>({});

interface PropertyRow {
    name: string;
    schema: SchemaObject;
    _origName: string;
}

const propertyRows = computed((): PropertyRow[] => {
    const props_ = props.schema.properties ?? {};
    return Object.keys(props_).map((name) => ({
        name,
        schema: props_[name],
        _origName: name,
    }));
});

function isRequired(name: string): boolean {
    return props.schema.required?.includes(name) ?? false;
}

function setRequired(name: string, required: boolean) {
    if (!props.schema.required) { props.schema.required = []; }
    if (required && !props.schema.required.includes(name)) {
        props.schema.required.push(name);
    } else if (!required) {
        props.schema.required = props.schema.required.filter((n) => n !== name);
        if (props.schema.required.length === 0) {
            delete props.schema.required;
        }
    }
}

function addProperty() {
    if (!props.schema.properties) { props.schema.properties = {}; }
    const key = `property${Object.keys(props.schema.properties).length + 1}`;
    props.schema.properties[key] = { type: 'string' };
    if (!props.schema.type) { props.schema.type = 'object'; }
}

function removeProperty(name: string) {
    if (!props.schema.properties) { return; }
    delete props.schema.properties[name];
    if (props.schema.required) {
        props.schema.required = props.schema.required.filter((n) => n !== name);
    }
}

function renameProperty(row: PropertyRow) {
    if (!props.schema.properties) { return; }
    const newName = row.name.trim();
    if (!newName || newName === row._origName) { return; }
    const schema = props.schema.properties[row._origName];
    delete props.schema.properties[row._origName];
    props.schema.properties[newName] = schema;
    row._origName = newName;
    // Update required list
    if (props.schema.required) {
        const idx = props.schema.required.indexOf(row._origName);
        if (idx !== -1) { props.schema.required[idx] = newName; }
    }
}

function ensureItems(schema: SchemaObject): SchemaObject {
    if (!schema.items) { schema.items = { type: 'string' }; }
    return schema.items;
}
</script>

<style scoped>
.schema-editor {
    font-size: 12px;
}

.schema-ref {
    padding: 8px 0;
}

.add-prop {
    margin-top: 8px;
}
</style>

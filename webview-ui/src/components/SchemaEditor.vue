<template>
    <div class="schema-editor">

        <!-- ── Object with properties ─────────────────────────────────────── -->
        <el-table v-if="isObject" :data="propertyRows" border size="small" style="width: 100%">
            <!-- Name -->
            <el-table-column :label="level > 0 ? undefined : '属性名'" min-width="130">
                <template #header v-if="level === 0">属性名</template>
                <template #default="{ row }">
                    <span v-if="isReferenceObject(row.schema)" class="ro-text">{{ row.name }}</span>
                    <el-input v-else v-model="row.name" size="small" @blur="renameProperty(row)" />
                </template>
            </el-table-column>

            <!-- Type -->
            <el-table-column label="类型" width="110">
                <template #default="{ row }">
                    <el-tag v-if="isReferenceObject(row.schema)" size="small" type="info" class="ref-type-tag">
                        $ref
                    </el-tag>
                    <el-select v-else v-model="(row.schema as any).type" size="small" style="width: 100%">
                        <el-option v-for="t in SCHEMA_TYPES" :key="t" :label="t" :value="t" />
                    </el-select>
                </template>
            </el-table-column>

            <!-- Format -->
            <el-table-column label="格式" width="100">
                <template #default="{ row }">
                    <span v-if="isReferenceObject(row.schema)" class="ro-text">—</span>
                    <el-input v-else v-model="(row.schema as any).format" size="small" placeholder="e.g. date-time" />
                </template>
            </el-table-column>

            <!-- Required -->
            <el-table-column label="必填" width="58" align="center">
                <template #default="{ row }">
                    <el-checkbox :model-value="isRequired(row.name)"
                        @change="(v: boolean) => setRequired(row.name, v)" />
                </template>
            </el-table-column>

            <!-- Description -->
            <el-table-column label="描述" min-width="140">
                <template #default="{ row }">
                    <span v-if="isReferenceObject(row.schema)" class="ro-text ref-path">
                        {{ (row.schema as ReferenceObject).$ref }}
                    </span>
                    <el-input v-else v-model="(row.schema as any).description" size="small" placeholder="说明" />
                </template>
            </el-table-column>

            <!-- Expand / Delete -->
            <el-table-column label="" width="44" align="center">
                <template #default="{ row, $index }">
                    <el-button
                        v-if="isReferenceObject(row.schema) || (row.schema as any).type === 'object' || (row.schema as any).type === 'array' || (row.schema as any).properties"
                        size="small" text :icon="expanded[$index] ? ArrowDown : ArrowRight"
                        @click="expanded[$index] = !expanded[$index]" />
                    <el-button v-else size="small" type="danger" text :icon="Delete"
                        @click="removeProperty(row.name)" />
                </template>
            </el-table-column>

            <!-- Nested rows -->
            <template #append>
                <template v-for="(row, idx) in propertyRows" :key="`nested-${row.name}`">
                    <tr v-if="expanded[idx]">
                        <td :colspan="6" style="padding: 8px 0 8px 32px; background: #fafafa;">
                            <!-- $ref property → read-only viewer -->
                            <template v-if="isReferenceObject(row.schema)">
                                <SchemaViewer :schema="row.schema" :level="level + 1" />
                            </template>
                            <!-- array property with $ref items -->
                            <template
                                v-else-if="(row.schema as any).type === 'array' && isReferenceObject((row.schema as any).items)">
                                <div style="font-size:12px; margin-bottom: 4px; opacity: 0.7">数组项 (items):</div>
                                <SchemaViewer :schema="(row.schema as any).items" :level="level + 1" />
                            </template>
                            <!-- array property with schema items -->
                            <template v-else-if="(row.schema as any).type === 'array'">
                                <div style="font-size:12px; margin-bottom: 4px; opacity: 0.7">数组项 (items):</div>
                                <SchemaEditor :schema="ensureItems(row.schema as SchemaObject)" :level="level + 1" />
                            </template>
                            <!-- object / nested properties -->
                            <template v-else>
                                <SchemaEditor :schema="(row.schema as SchemaObject)" :level="level + 1" />
                            </template>
                        </td>
                    </tr>
                </template>
            </template>
        </el-table>

        <!-- ── Non-object schema fields ───────────────────────────────────── -->
        <template v-if="!isObject">
            <el-form :model="schema" label-width="70px" label-position="left" size="small">
                <el-form-item label="类型">
                    <el-select v-model="(schema as any).type" style="width: 120px">
                        <el-option v-for="t in SCHEMA_TYPES" :key="t" :label="t" :value="t" />
                    </el-select>
                </el-form-item>
                <el-form-item label="格式">
                    <el-input v-model="(schema as any).format" placeholder="e.g. date-time, int64"
                        style="width: 180px" />
                </el-form-item>
                <el-form-item label="描述">
                    <el-input v-model="(schema as any).description" placeholder="说明" />
                </el-form-item>
                <!-- Enum values -->
                <el-form-item v-if="supportsEnum" label="枚举值">
                    <div class="enum-editor">
                        <el-tag v-for="(v, i) in (schema as any).enum ?? []" :key="i" closable size="small"
                            style="margin: 2px" @close="removeEnumValue(i)">{{ v }}</el-tag>
                        <el-input v-model="newEnumValue" size="small" placeholder="添加值"
                            style="width: 100px; margin: 2px" @keydown.enter="addEnumValue" />
                        <el-button size="small" :icon="Plus" @click="addEnumValue" style="margin: 2px" />
                    </div>
                </el-form-item>
            </el-form>

            <!-- Array items editing section -->
            <template v-if="(schema as any).type === 'array'">
                <div class="items-section-header" @click="itemsExpanded = !itemsExpanded">
                    <el-icon>
                        <component :is="itemsExpanded ? ArrowDown : ArrowRight" />
                    </el-icon>
                    <span class="items-section-label">数组项 (items)</span>
                    <el-button v-if="!(schema as any).items" size="small" text :icon="Plus" @click.stop="initItems"
                        style="margin-left: 4px" />
                </div>
                <div v-if="itemsExpanded" class="items-body">
                    <SchemaViewer v-if="isReferenceObject((schema as any).items)" :schema="(schema as any).items"
                        :level="level + 1" />
                    <SchemaEditor v-else-if="(schema as any).items" :schema="(schema as any).items"
                        :level="level + 1" />
                    <div v-else class="no-items">
                        <el-button size="small" :icon="Plus" plain @click="initItems">定义数组项</el-button>
                    </div>
                </div>
            </template>
        </template>

        <!-- ── Add property button ─────────────────────────────────────────── -->
        <div v-if="isObject" class="add-prop">
            <el-button size="small" :icon="Plus" plain @click="addProperty">添加属性</el-button>
        </div>

        <!-- ── Convert to object button ───────────────────────────────────── -->
        <div v-if="!isObject && (schema as any).type !== 'array'" class="add-prop">
            <el-button v-if="(schema as any).type !== 'object'" size="small" plain
                @click="(schema as any).type = 'object'">
                转为对象类型
            </el-button>
        </div>

    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { Plus, Delete, ArrowDown, ArrowRight } from '@element-plus/icons-vue';
import type { SchemaObject, ReferenceObject } from '@shared/types';
import { isReferenceObject, isArraySchemaObject } from '../utils/resolve';
import SchemaViewer from './SchemaViewer.vue';

const SCHEMA_TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'object'];

const props = defineProps<{
    schema: SchemaObject;
    level?: number;
}>();

const level = computed(() => props.level ?? 0);
const expanded = reactive<Record<number, boolean>>({});
const itemsExpanded = ref(false);
const newEnumValue = ref('');

// ── Object detection ──────────────────────────────────────────────────────────
const isObject = computed((): boolean => {
    return (props.schema as any).type === 'object' || !!(props.schema as any).properties;
});

const supportsEnum = computed((): boolean => {
    const t = (props.schema as any).type;
    return t === 'string' || t === 'number' || t === 'integer' || t === 'boolean';
});

// ── Property table ─────────────────────────────────────────────────────────────
interface PropertyRow {
    name: string;
    schema: SchemaObject | ReferenceObject;
    _origName: string;
}

const propertyRows = computed((): PropertyRow[] => {
    const p: Record<string, SchemaObject | ReferenceObject> = (props.schema as any).properties ?? {};
    return Object.keys(p).map((name) => ({ name, schema: p[name], _origName: name }));
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
        if (props.schema.required.length === 0) { delete props.schema.required; }
    }
}

function addProperty() {
    if (!(props.schema as any).properties) { (props.schema as any).properties = {}; }
    const key = `property${Object.keys((props.schema as any).properties).length + 1}`;
    (props.schema as any).properties[key] = { type: 'string' };
    if (!(props.schema as any).type) { (props.schema as any).type = 'object'; }
}

function removeProperty(name: string) {
    if (!(props.schema as any).properties) { return; }
    delete (props.schema as any).properties[name];
    if (props.schema.required) {
        props.schema.required = props.schema.required.filter((n) => n !== name);
    }
}

function renameProperty(row: PropertyRow) {
    if (!(props.schema as any).properties) { return; }
    const newName = row.name.trim();
    const oldName = row._origName;
    if (!newName || newName === oldName) { return; }
    const schema = (props.schema as any).properties[oldName];
    delete (props.schema as any).properties[oldName];
    (props.schema as any).properties[newName] = schema;
    row._origName = newName;
    if (props.schema.required) {
        const idx = props.schema.required.indexOf(oldName);
        if (idx !== -1) { props.schema.required[idx] = newName; }
    }
}

function ensureItems(schema: SchemaObject): SchemaObject {
    if (!isArraySchemaObject(schema)) { return { type: 'string' }; }
    return schema.items as SchemaObject;
}

function initItems() {
    (props.schema as any).items = { type: 'string' };
    itemsExpanded.value = true;
}

// ── Enum editing ──────────────────────────────────────────────────────────────
function addEnumValue() {
    const val = newEnumValue.value.trim();
    if (!val) { return; }
    const t = (props.schema as any).type;
    const typed = (t === 'number' || t === 'integer') ? Number(val) : val;
    if (!(props.schema as any).enum) { (props.schema as any).enum = []; }
    (props.schema as any).enum.push(typed);
    newEnumValue.value = '';
}

function removeEnumValue(i: number) {
    const e: unknown[] = (props.schema as any).enum;
    if (!e) { return; }
    e.splice(i, 1);
    if (e.length === 0) { delete (props.schema as any).enum; }
}
</script>

<style scoped>
.schema-editor {
    font-size: 12px;
}

.ro-text {
    font-size: 12px;
    padding: 0 4px;
    color: var(--vscode-foreground, #333);
}

.ref-type-tag {
    font-family: monospace;
}

.ref-path {
    font-family: monospace;
    font-size: 11px;
    opacity: 0.75;
}

.add-prop {
    margin-top: 8px;
}

.enum-editor {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
}

.items-section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    padding: 4px 2px;
    margin-top: 6px;
    border-radius: 3px;
    user-select: none;
}

.items-section-header:hover {
    background: var(--vscode-list-hoverBackground, #f5f5f5);
}

.items-section-label {
    font-size: 12px;
    opacity: 0.8;
}

.items-body {
    padding: 4px 0 4px 16px;
    border-left: 2px solid var(--vscode-panel-border, #e4e7ed);
    margin-top: 4px;
}

.no-items {
    padding: 8px 0 4px;
}
</style>

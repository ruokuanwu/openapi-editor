<template>
    <div class="schema-editor">
        <!-- $ref: enhanced display -->
        <div v-if="schema.$ref" class="schema-ref">
            <!-- Ref header row -->
            <div class="ref-header">
                <el-tag type="info" size="small" class="ref-tag">
                    $ref: {{ refComponentName || schema.$ref }}
                </el-tag>
                <div class="ref-actions">
                    <!-- Expand / collapse -->
                    <el-button size="small" text @click="refExpanded = !refExpanded">
                        {{ refExpanded ? '收起' : '展开' }}
                    </el-button>
                    <!-- View mode toggle (only when expanded) -->
                    <el-button-group v-if="refExpanded && resolvedRef" size="small">
                        <el-button :type="refViewMode === 'table' ? 'primary' : ''" size="small" text
                            @click="refViewMode = 'table'">表格</el-button>
                        <el-button :type="refViewMode === 'json' ? 'primary' : ''" size="small" text
                            @click="refViewMode = 'json'">JSON</el-button>
                    </el-button-group>
                    <!-- Jump to component (only if resolvable) -->
                    <el-tooltip v-if="refComponentName" content="跳转到组件" placement="top" :show-after="600">
                        <el-button size="small" text :icon="Right" @click="jumpToComponent" />
                    </el-tooltip>
                    <!-- Replace ref button (only when not readonly) -->
                    <el-tooltip v-if="!readonly" content="更换引用组件" placement="top" :show-after="600">
                        <el-button size="small" text :icon="Edit" @click="showRefPicker = true" />
                    </el-tooltip>
                    <!-- Inline (dereference) button (only when not readonly) -->
                    <el-tooltip v-if="!readonly && resolvedRef" content="解除引用（内联展开）" placement="top" :show-after="600">
                        <el-button size="small" text :icon="DocumentCopy" @click="derefSchema" />
                    </el-tooltip>
                </div>
            </div>

            <!-- Expanded view -->
            <div v-if="refExpanded" class="ref-expanded">
                <div v-if="!resolvedRef" class="ref-unresolved">⚠ 无法解析引用 {{ schema.$ref }}</div>
                <template v-else>
                    <!-- Table view -->
                    <SchemaEditor v-if="refViewMode === 'table'" :schema="resolvedRef" :readonly="true" :level="0" />
                    <!-- JSON view (Mock instance data, not schema metadata) -->
                    <pre v-else class="ref-json">{{ JSON.stringify(generateMockData(resolvedRef, docStore.doc), null, 2) }}</pre>
                </template>
            </div>

            <!-- Ref picker dialog -->
            <el-dialog v-model="showRefPicker" title="选择引用组件" width="400px" :append-to-body="true">
                <el-select v-model="pickedRef" filterable placeholder="搜索 Schema 名称" style="width: 100%">
                    <el-option v-for="name in docStore.allSchemaNames" :key="name"
                        :label="name" :value="'#/components/schemas/' + name" />
                </el-select>
                <template #footer>
                    <el-button @click="showRefPicker = false">取消</el-button>
                    <el-button type="primary" @click="applyRefPick">确定</el-button>
                </template>
            </el-dialog>
        </div>

        <!-- Object / base schema (editable or readonly) -->
        <template v-else>
            <!-- Properties table -->
            <el-table v-if="schema.type === 'object' || schema.properties" :data="propertyRows" border size="small"
                style="width: 100%">
                <el-table-column :label="level > 0 ? undefined : '属性名'" min-width="130">
                    <template #header v-if="level === 0">属性名</template>
                    <template #default="{ row }">
                        <span v-if="readonly" class="ro-text">{{ row.name }}</span>
                        <el-input v-else v-model="row.name" size="small" @blur="renameProperty(row)" />
                    </template>
                </el-table-column>

                <el-table-column label="类型" width="110">
                    <template #default="{ row }">
                        <span v-if="readonly" class="ro-text">{{ row.schema.type }}</span>
                        <el-select v-else v-model="row.schema.type" size="small" style="width: 100%">
                            <el-option v-for="t in SCHEMA_TYPES" :key="t" :label="t" :value="t" />
                        </el-select>
                    </template>
                </el-table-column>

                <el-table-column label="格式" width="100">
                    <template #default="{ row }">
                        <span v-if="readonly" class="ro-text">{{ row.schema.format ?? '' }}</span>
                        <el-input v-else v-model="row.schema.format" size="small" placeholder="e.g. date-time" />
                    </template>
                </el-table-column>

                <el-table-column label="必填" width="58" align="center">
                    <template #default="{ row }">
                        <el-checkbox :model-value="isRequired(row.name)"
                            :disabled="readonly"
                            @change="(v: boolean) => { if (!readonly) setRequired(row.name, v); }" />
                    </template>
                </el-table-column>

                <el-table-column label="描述" min-width="140">
                    <template #default="{ row }">
                        <span v-if="readonly" class="ro-text">{{ row.schema.description ?? '' }}</span>
                        <el-input v-else v-model="row.schema.description" size="small" placeholder="说明" />
                    </template>
                </el-table-column>

                <!-- Expand nested object / delete -->
                <el-table-column label="" width="44" align="center">
                    <template #default="{ row, $index }">
                        <el-button v-if="row.schema.type === 'object' || row.schema.$ref" size="small" text
                            :icon="expanded[$index] ? ArrowDown : ArrowRight"
                            @click="expanded[$index] = !expanded[$index]" />
                        <el-button v-else-if="!readonly" size="small" type="danger" text :icon="Delete"
                            @click="removeProperty(row.name)" />
                    </template>
                </el-table-column>

                <!-- Nested SchemaEditor row -->
                <template #append>
                    <template v-for="(row, idx) in propertyRows" :key="`nested-${row.name}`">
                        <tr v-if="(row.schema.type === 'object' || row.schema.$ref) && expanded[idx]">
                            <td :colspan="6" style="padding: 0 0 0 32px; background: #fafafa;">
                                <SchemaEditor :schema="row.schema" :level="level + 1" :readonly="readonly" />
                            </td>
                        </tr>
                        <tr v-if="row.schema.type === 'array' && expanded[idx]">
                            <td :colspan="6" style="padding: 8px 0 8px 32px; background: #fafafa;">
                                <div style="font-size:12px; margin-bottom: 4px; opacity: 0.7">数组项 (items):</div>
                                <SchemaEditor :schema="ensureItems(row.schema)" :level="level + 1" :readonly="readonly" />
                            </td>
                        </tr>
                    </template>
                </template>
            </el-table>

            <!-- Non-object leaf schema fields -->
            <template v-if="schema.type !== 'object' && !schema.properties">
                <el-form :model="schema" label-width="70px" label-position="left" size="small">
                    <el-form-item label="类型">
                        <span v-if="readonly" class="ro-text">{{ schema.type }}</span>
                        <el-select v-else v-model="schema.type" style="width: 120px">
                            <el-option v-for="t in SCHEMA_TYPES" :key="t" :label="t" :value="t" />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="格式">
                        <span v-if="readonly" class="ro-text">{{ schema.format ?? '' }}</span>
                        <el-input v-else v-model="schema.format" placeholder="e.g. date-time, int64" style="width: 180px" />
                    </el-form-item>
                    <el-form-item label="描述">
                        <span v-if="readonly" class="ro-text">{{ schema.description ?? '' }}</span>
                        <el-input v-else v-model="schema.description" placeholder="说明" />
                    </el-form-item>
                </el-form>
            </template>

            <!-- Add property button (only for object schemas, non-readonly) -->
            <div v-if="!readonly && (schema.type === 'object' || schema.properties)" class="add-prop">
                <el-button size="small" :icon="Plus" plain @click="addProperty">
                    添加属性
                </el-button>
            </div>

            <!-- Convert to object button -->
            <div v-if="!readonly && (!schema.type || schema.type === 'object')" class="add-prop">
                <el-button v-if="schema.type !== 'object'" size="small" plain @click="schema.type = 'object'">
                    转为对象类型
                </el-button>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { Plus, Delete, ArrowDown, ArrowRight, Right, Edit, DocumentCopy } from '@element-plus/icons-vue';
import { useDocStore } from '../store/useDocStore';
import type { SchemaObject } from '../types';
import { generateMockData } from '../utils/mockGenerator';

const SCHEMA_TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'object'];

const props = defineProps<{
    schema: SchemaObject;
    level?: number;
    readonly?: boolean;
}>();

const level = computed(() => props.level ?? 0);
const readonly = computed(() => props.readonly ?? false);

const docStore = useDocStore();

// Expand state per row index
const expanded = reactive<Record<number, boolean>>({});

// ── $ref handling ────────────────────────────────────────────────────────────
const refExpanded = ref(false);
const refViewMode = ref<'table' | 'json'>('table');
const showRefPicker = ref(false);
const pickedRef = ref('');

const refComponentName = computed((): string | null => {
    const ref = props.schema.$ref;
    if (!ref) { return null; }
    const match = ref.match(/^#\/components\/schemas\/(.+)$/);
    return match ? match[1] : null;
});

const resolvedRef = computed((): SchemaObject | null => {
    const name = refComponentName.value;
    if (!name || !docStore.doc?.components?.schemas) { return null; }
    return docStore.doc.components.schemas[name] ?? null;
});

function jumpToComponent() {
    const name = refComponentName.value;
    if (name) { docStore.selectComponent('schemas', name); }
}

function applyRefPick() {
    if (pickedRef.value) {
        // Remove all other schema properties, keep only $ref
        const keys = Object.keys(props.schema) as (keyof SchemaObject)[];
        keys.forEach((k) => { if (k !== '$ref') { delete props.schema[k]; } });
        props.schema.$ref = pickedRef.value;
    }
    showRefPicker.value = false;
}

function derefSchema() {
    const resolved = resolvedRef.value;
    if (!resolved) { return; }
    const copy = JSON.parse(JSON.stringify(resolved)) as SchemaObject;
    // Remove all current keys from schema and apply copy
    const keys = Object.keys(props.schema) as (keyof SchemaObject)[];
    keys.forEach((k) => { delete props.schema[k]; });
    Object.assign(props.schema, copy);
}

// ── Property table ───────────────────────────────────────────────────────────
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

/* ── $ref display ────────────────────────────────────────── */
.schema-ref {
    padding: 4px 0;
}

.ref-header {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
}

.ref-tag {
    font-family: monospace;
}

.ref-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-wrap: wrap;
}

.ref-expanded {
    margin-top: 8px;
    border: 1px solid var(--vscode-panel-border, #e4e7ed);
    border-radius: 4px;
    padding: 8px;
    background: var(--vscode-editor-background, #fff);
}

.ref-unresolved {
    color: #e6a23c;
    font-size: 12px;
}

.ref-json {
    margin: 0;
    padding: 4px;
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

/* ── Read-only text ──────────────────────────────────────── */
.ro-text {
    font-size: 12px;
    padding: 0 4px;
    color: var(--vscode-foreground, #333);
}

.add-prop {
    margin-top: 8px;
}
</style>

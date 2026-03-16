<template>
    <div class="schema-editor">

        <!-- ── Object with properties ─────────────────────────────────────── -->
        <template v-if="isObject">
            <el-table :data="displayRows" border size="small" style="width: 100%" :span-method="spanMethod">
                <el-table-column :label="level > 0 ? undefined : '属性名'" min-width="130">
                    <template #header v-if="level === 0">属性名</template>
                    <template #default="{ row }">
                        <div v-if="row._expansion" class="prop-expansion-block">
                            <template v-if="isReferenceObject(row.schema)">
                                <SchemaViewer :schema="row.schema" :level="level + 1" />
                            </template>
                            <template
                                v-else-if="(row.schema as any).type === 'array' && isReferenceObject((row.schema as any).items)">
                                <SchemaViewer :schema="(row.schema as any).items" :level="level + 1" />
                            </template>
                            <template v-else>
                                <SchemaEditor :schema="(row.schema as SchemaObject)" :level="level + 1" />
                            </template>
                        </div>
                        <span v-else-if="isReferenceObject(row.schema)" class="ro-text">{{ row.name }}</span>
                        <el-input v-else v-model="row.name" size="small" @blur="renameProperty(row)" />
                    </template>
                </el-table-column>

                <!-- Type -->
                <el-table-column label="类型" width="110">
                    <template #default="{ row }">
                        <template v-if="!row._expansion">
                            <el-tag v-if="isReferenceObject(row.schema)" size="small" type="info" class="ref-type-tag">
                                $ref
                            </el-tag>
                            <el-select v-else v-model="(row.schema as any).type" size="small" style="width: 100%">
                                <el-option v-for="t in SCHEMA_TYPES" :key="t" :label="t" :value="t" />
                            </el-select>
                        </template>
                    </template>
                </el-table-column>

                <!-- Format -->
                <el-table-column label="格式" width="100">
                    <template #default="{ row }">
                        <template v-if="!row._expansion">
                            <span v-if="isReferenceObject(row.schema)" class="ro-text">—</span>
                            <el-input v-else v-model="(row.schema as any).format" size="small"
                                placeholder="e.g. date-time" />
                        </template>
                    </template>
                </el-table-column>

                <!-- Required -->
                <el-table-column label="必填" width="58" align="center">
                    <template #default="{ row }">
                        <el-checkbox v-if="!row._expansion" :model-value="isRequired(row.name)"
                            @change="(v: boolean) => setRequired(row.name, v)" />
                    </template>
                </el-table-column>

                <!-- Description -->
                <el-table-column label="描述" min-width="140">
                    <template #default="{ row }">
                        <template v-if="!row._expansion">
                            <span v-if="isReferenceObject(row.schema)" class="ro-text ref-path">
                                {{ (row.schema as ReferenceObject).$ref }}
                            </span>
                            <el-input v-else v-model="(row.schema as any).description" size="small" placeholder="说明" />
                        </template>
                    </template>
                </el-table-column>

                <!-- Expand -->
                <el-table-column label="" width="70" align="center">
                    <template #default="{ row }">
                        <div style="display: flex; gap: 4px; justify-content: center;">
                            <el-button size="small" text :icon="expandedNames[row.name] ? ArrowDown : ArrowRight"
                                @click="expandedNames[row.name] = !expandedNames[row.name]" />
                            <el-button size="small" type="danger" text :icon="Delete"
                                @click="removeProperty(row.name)" />
                        </div>
                    </template>
                </el-table-column>
            </el-table>

            <div class="array-add-row" @click="addProperty">
                <el-icon class="array-add-icon">
                    <Plus />
                </el-icon>
                <span>添加属性</span>
            </div>
        </template>

        <!-- ── Array ─────────────────────────────────────────────────────── -->
        <template v-else-if="(schema as any).type === 'array'">
            <!-- items 存在时：内容区 + 右侧红色垃圾桶 -->
            <div v-if="(schema as any).items" class="array-items-wrapper">
                <div class="array-items-content">
                    <SchemaViewer v-if="isReferenceObject((schema as any).items)" :schema="(schema as any).items"
                        :level="level + 1" />
                    <SchemaEditor v-else :schema="(schema as any).items" :level="level + 1" />
                </div>
                <div class="array-items-delete">
                    <el-button size="small" type="danger" text :icon="Delete" @click="removeItems" />
                </div>
            </div>

            <!-- items 尚未定义时：点击整行添加 -->
            <div v-else class="array-add-row" @click="initItems">
                <el-icon class="array-add-icon">
                    <Plus />
                </el-icon>
                <span>添加项目</span>
            </div>
        </template>

        <!-- ── allOf / oneOf / anyOf ──────────────────────────────────────── -->
        <template v-else-if="hasCombinator">
            <div v-for="key in combKeys" :key="key" class="combo-section">
                <div class="combo-header" @click="comboExpanded[key] = !comboExpanded[key]">
                    <el-icon>
                        <component :is="comboExpanded[key] ? ArrowDown : ArrowRight" />
                    </el-icon>
                    <el-tag size="small" type="warning">{{ key }}</el-tag>
                    <span class="combo-count">{{ (schema as any)[key].length }} 个子 schema</span>
                </div>
                <div v-if="comboExpanded[key]" class="nested-block">
                    <div v-for="(item, i) in (schema as any)[key]" :key="(i as number)" class="combo-item">
                        <el-tag size="small" style="margin-bottom:4px">{{ (i as number) + 1 }}</el-tag>
                        <SchemaEditor :schema="item" :level="level + 1" />
                    </div>
                </div>
            </div>
        </template>

        <template v-else>
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
                        <el-tag v-for="(v, i) in (schema as any).enum ?? []" :key="(i as number)" closable size="small"
                            style="margin: 2px" @close="removeEnumValue(i as number)">{{ v }}</el-tag>
                        <el-input v-model="newEnumValue" size="small" placeholder="添加值"
                            style="width: 100px; margin: 2px" @keydown.enter="addEnumValue" />
                        <el-button size="small" :icon="Plus" @click="addEnumValue" style="margin: 2px" />
                    </div>
                </el-form-item>
            </el-form>
            <div class="add-prop">
                <el-button size="small" plain @click="(schema as any).type = 'object'">转为对象类型</el-button>
            </div>
        </template>

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
const expandedNames = reactive<Record<string, boolean>>({});
const itemsExpanded = ref(false);
const newEnumValue = ref('');

// ── Combinator handling ───────────────────────────────────────────────────────
const COMBI = ['allOf', 'oneOf', 'anyOf'] as const;
const hasCombinator = computed((): boolean => COMBI.some((k) => !!(props.schema as any)[k]));
const combKeys = computed(() => COMBI.filter((k) => !!(props.schema as any)[k]));
const comboExpanded = reactive<Record<string, boolean>>({});

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

const displayRows = computed(() => {
    const result: any[] = [];
    for (const row of propertyRows.value) {
        result.push(row);
        if (expandedNames[row.name]) {
            result.push({ _expansion: true, name: row.name, schema: row.schema });
        }
    }
    return result;
});

function spanMethod({ row, columnIndex }: any) {
    if (row._expansion) {
        return columnIndex === 0 ? [1, 6] : [0, 0];
    }
    return [1, 1];
}

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

function removeItems() {
    (props.schema as any).items = undefined;
    itemsExpanded.value = false;
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

.array-items-wrapper {
    display: flex;
    align-items: stretch;
    border: 1px solid var(--vscode-panel-border, #e4e7ed);
    border-radius: 4px;
    margin-top: 4px;
}

.array-items-content {
    flex: 1;
    padding: 8px;
    min-width: 0;
}

.array-items-delete {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 6px;
    border-left: 1px solid var(--vscode-panel-border, #e4e7ed);
}

.array-add-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 0;
    margin-top: 4px;
    border: 1px dashed var(--vscode-panel-border, #e4e7ed);
    border-radius: 4px;
    cursor: pointer;
    color: var(--vscode-textLink-foreground, #409eff);
    font-size: 12px;
    transition: background 0.15s;
}

.array-add-row:hover {
    background: var(--vscode-list-hoverBackground, rgba(64, 158, 255, 0.08));
}

.array-add-icon {
    font-size: 14px;
}

.prop-expansion-block {
    margin-top: 4px;
    padding: 8px 8px 8px 16px;
    border-left: 2px solid var(--vscode-panel-border, #e4e7ed);
    border-bottom: 1px solid var(--vscode-panel-border, #e4e7ed);
}

.prop-expansion-header {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 4px;
}

.prop-expansion-label {
    font-size: 11px;
    opacity: 0.6;
    margin-bottom: 6px;
    font-family: monospace;
}

.combo-section {
    margin-top: 6px;
}

.combo-header {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    padding: 4px 2px;
    border-radius: 3px;
    user-select: none;
}

.combo-header:hover {
    background: var(--vscode-list-hoverBackground, #f5f5f5);
}

.combo-count {
    font-size: 11px;
    opacity: 0.6;
    margin-left: 4px;
}

.nested-block {
    padding: 4px 0 4px 16px;
    border-left: 2px solid var(--vscode-panel-border, #e4e7ed);
    margin-top: 4px;
}

.combo-item {
    margin-bottom: 8px;
}
</style>

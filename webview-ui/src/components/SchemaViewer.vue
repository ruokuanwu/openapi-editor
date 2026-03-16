<template>
    <div class="schema-viewer">

        <!-- ── $ref ──────────────────────────────────────────────────────── -->
        <template v-if="isRef">
            <div v-if="resolvedRef" class="ref-block">
                <div class="ref-block-label">
                    <span class="ref-block-arrow">↳</span>
                    <span class="ref-block-name">{{ refName }}</span>
                    <span v-if="resolvedRefType" class="ref-block-type">{{ resolvedRefType }}</span>
                </div>
                <SchemaViewer :schema="resolvedRef" :level="lv + 1" />
            </div>
        </template>

        <!-- ── object with properties ────────────────────────────────────── -->
        <template v-else-if="(s as any).type === 'object' || (s as any).properties">
            <el-table :data="displayPropRows" border size="small" style="width:100%" :span-method="propSpanMethod">
                <el-table-column label="属性名" min-width="130">
                    <template #default="{ row }">
                        <div v-if="row._expansion" style="padding:8px 0 8px 32px;">
                            <SchemaViewer :schema="row.schema" :level="lv + 1" />
                        </div>
                        <span v-else class="ro-text">{{ row.name }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="类型" width="110">
                    <template #default="{ row }">
                        <span class="ro-text">{{ typeLabel(resolveSchema(_doc, row.schema)!) }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="格式" width="100">
                    <template #default="{ row }">
                        <span class="ro-text">{{ (row.schema as any).format ?? '' }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="必填" width="58" align="center">
                    <template #default="{ row }">
                        <el-checkbox :model-value="isRequired(row.name)" disabled />
                    </template>
                </el-table-column>
                <el-table-column label="描述" min-width="140">
                    <template #default="{ row }">
                        <span class="ro-text">{{ (row.schema as any).description ?? '' }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="" width="44" align="center">
                    <template #default="{ row }">
                        <el-button v-if="!row._expansion && isExpandable(row.schema)" size="small" text
                            :icon="expandedNames[row.name] ? ArrowDown : ArrowRight"
                            @click="expandedNames[row.name] = !expandedNames[row.name]" />
                    </template>
                </el-table-column>
            </el-table>
        </template>

        <!-- ── top-level array ───────────────────────────────────────────── -->
        <template v-else-if="(s as any).type === 'array'">
            <SchemaViewer v-if="arrayItems" :schema="arrayItems" :level="lv + 1" />
            <span v-else class="ro-text">未定义</span>
        </template>

        <!-- ── allOf / oneOf / anyOf ─────────────────────────────────────── -->
        <template v-else-if="hasCombinator">
            <div v-for="key in combKeys" :key="key" class="combo-section">
                <div class="combo-header" @click="comboExpanded[key] = !comboExpanded[key]">
                    <el-icon>
                        <component :is="comboExpanded[key] ? ArrowDown : ArrowRight" />
                    </el-icon>
                    <el-tag size="small" type="warning">{{ key }}</el-tag>
                    <span class="combo-count">{{ (s as any)[key].length }} 个子 schema</span>
                </div>
                <div v-if="comboExpanded[key]" class="nested-block">
                    <div v-for="(item, i) in (s as any)[key]" :key="i" class="combo-item">
                        <el-tag size="small" style="margin-bottom:4px">{{ i + 1 }}</el-tag>
                        <SchemaViewer :schema="item" :level="lv + 1" />
                    </div>
                </div>
            </div>
        </template>

        <!-- ── leaf ──────────────────────────────────────────────────────── -->
        <template v-else>
            <el-form label-width="70px" label-position="left" size="small" class="leaf-form">
                <el-form-item label="类型" class="compact-item">
                    <span class="ro-text">{{ (s as any).type ?? '(未指定)' }}</span>
                </el-form-item>
                <el-form-item v-if="(s as any).format" label="格式" class="compact-item">
                    <span class="ro-text">{{ (s as any).format }}</span>
                </el-form-item>
                <el-form-item v-if="(s as any).description" label="描述" class="compact-item">
                    <span class="ro-text">{{ (s as any).description }}</span>
                </el-form-item>
                <el-form-item v-if="(s as any).enum" label="枚举值" class="compact-item">
                    <el-tag v-for="v in (s as any).enum" :key="String(v)" size="small" style="margin:2px">{{ v
                    }}</el-tag>
                </el-form-item>
            </el-form>
        </template>

    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { ArrowDown, ArrowRight } from '@element-plus/icons-vue';
import { useDocStore } from '../store/useDocStore';
import type { SchemaObject, ReferenceObject, OpenApiDoc } from '@shared/types';
import { isReferenceObject, getObjectByRef, resolveSchema } from '../utils/resolve';

const props = defineProps<{
    schema: SchemaObject | ReferenceObject;
    level?: number;
}>();

const lv = computed(() => props.level ?? 0);
const docStore = useDocStore();
const _doc = computed(() => docStore.doc as OpenApiDoc);

// ── $ref handling ────────────────────────────────────────────────────────────
const isRef = computed(() => isReferenceObject(props.schema));
const refStr = computed(() => (props.schema as ReferenceObject).$ref ?? '');
const refExpanded = ref(false);
const resolvedRef = computed((): SchemaObject | ReferenceObject | null => {
    if (!isRef.value) { return null; }
    try { return getObjectByRef(docStore.doc, refStr.value) as SchemaObject; } catch { return null; }
});
const refName = computed(() => {
    const parts = refStr.value.split('/');
    return parts[parts.length - 1] ?? refStr.value;
});
const resolvedRefType = computed((): string | null => {
    const r = resolvedRef.value as any;
    if (!r) { return null; }
    if (r.type) { return r.type; }
    if (r.properties) { return 'object'; }
    if (r.items !== undefined) { return 'array'; }
    return null;
});

// Treat schema as non-ref SchemaObject for convenience
const s = computed(() => props.schema as SchemaObject);

// ── Property rows ─────────────────────────────────────────────────────────────
interface PropEntry { name: string; schema: SchemaObject | ReferenceObject }
const expandedNames = reactive<Record<string, boolean>>({});

const propRows = computed((): PropEntry[] => {
    const p: Record<string, SchemaObject | ReferenceObject> = (s.value as any).properties ?? {};
    return Object.keys(p).map((name) => ({ name, schema: p[name] }));
});

const displayPropRows = computed(() => {
    const result: any[] = [];
    for (const row of propRows.value) {
        result.push(row);
        if (expandedNames[row.name]) {
            result.push({ _expansion: true, schema: row.schema });
        }
    }
    return result;
});

function propSpanMethod({ row, columnIndex }: any) {
    if (row._expansion) {
        return columnIndex === 0 ? [1, 6] : [0, 0];
    }
    return [1, 1];
}

function isRequired(name: string): boolean {
    return (s.value as any).required?.includes(name) ?? false;
}

function isExpandable(schema: SchemaObject | ReferenceObject): boolean {
    if (isReferenceObject(schema)) { return true; }
    const so = schema as any;
    return so.type === 'object' || so.type === 'array' || !!so.properties
        || !!so.allOf || !!so.oneOf || !!so.anyOf;
}

function typeLabel(schema: SchemaObject | ReferenceObject): string {
    if (isReferenceObject(schema)) { return '$ref'; }
    return String((schema as any).type ?? '');
}

// ── Array items ───────────────────────────────────────────────────────────────
const itemsExpanded = ref(true);
const arrayItems = computed((): SchemaObject | ReferenceObject | null => (s.value as any).items ?? null);

// ── allOf / oneOf / anyOf ─────────────────────────────────────────────────────
const COMBI = ['allOf', 'oneOf', 'anyOf'] as const;
const hasCombinator = computed(() => !isRef.value && COMBI.some((k) => (s.value as any)[k]));
const combKeys = computed(() => COMBI.filter((k) => (s.value as any)[k]));
const comboExpanded = reactive<Record<string, boolean>>({});
</script>

<style scoped>
.schema-viewer {
    font-size: 12px;
}

.ref-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 0;
}

.ref-tag {
    font-family: monospace;
}

.ref-unresolved {
    color: #e6a23c;
    font-size: 12px;
}

.ro-text {
    font-size: 12px;
    padding: 0 4px;
    color: var(--vscode-foreground, #333);
}

.leaf-form {
    margin: 0;
}

.leaf-form :deep(.el-form-item) {
    margin-bottom: 4px;
}

.compact-item {
    margin-bottom: 4px;
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

.combo-label {
    font-size: 12px;
    opacity: 0.8;
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

.ref-block {
    padding: 4px 0 4px 12px;
    border-left: 2px solid var(--vscode-panel-border, #e4e7ed);
    margin-top: 4px;
}

.ref-block-label {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 6px;
    opacity: 0.5;
    font-size: 11px;
    line-height: 1;
    user-select: none;
}

.ref-block-arrow {
    font-size: 11px;
    color: var(--vscode-descriptionForeground, #999);
}

.ref-block-name {
    font-family: 'Consolas', 'Courier New', monospace;
    color: var(--vscode-foreground, #555);
    letter-spacing: 0.2px;
}

.ref-block-type {
    background: var(--vscode-textCodeBlock-background, #f0f0f0);
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 10px;
    color: var(--vscode-descriptionForeground, #888);
}

.combo-item {
    margin-bottom: 8px;
}
</style>

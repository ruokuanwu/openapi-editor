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
                <SchemaViewer :schema="resolvedRef" :level="lv + 1" :doc="effectiveDoc" />
            </div>
            <div v-else class="ref-unresolved">
                <span class="ref-block-arrow">↳</span>
                <span class="ref-unresolved-text">{{ refStr }}（无法解析）</span>
            </div>
        </template>

        <!-- ── object with properties ────────────────────────────────────── -->
        <template v-else-if="(s as any).type === 'object' || (s as any).properties">
            <el-table :data="displayRows" border size="small" style="width:100%" :span-method="spanMethod">
                <el-table-column label="属性名" min-width="130">
                    <template #default="{ row }">
                        <div v-if="row._expansion" class="prop-expansion-block">
                            <SchemaViewer :schema="row.schema" :level="lv + 1" :doc="effectiveDoc" />
                        </div>
                        <span v-else class="ro-text">
                            {{ row.name }}
                            <el-tag v-if="isRequired(row.name)" type="danger" size="small" class="required-tag">必填</el-tag>
                        </span>
                    </template>
                </el-table-column>
                <el-table-column label="类型" width="110">
                    <template #default="{ row }">
                        <template v-if="!row._expansion">
                            <el-tag v-if="isReferenceObject(row.schema)" size="small" type="info" class="ref-type-tag">
                                {{ refShortName(row.schema) }}
                            </el-tag>
                            <span v-else class="ro-text">{{ typeLabel(row.schema) }}</span>
                        </template>
                    </template>
                </el-table-column>
                <el-table-column label="格式" width="100">
                    <template #default="{ row }">
                        <span v-if="!row._expansion" class="ro-text">{{ (row.schema as any).format ?? '' }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="必填" width="58" align="center">
                    <template #default="{ row }">
                        <el-checkbox v-if="!row._expansion" :model-value="isRequired(row.name)" disabled />
                    </template>
                </el-table-column>
                <el-table-column label="描述" min-width="140">
                    <template #default="{ row }">
                        <template v-if="!row._expansion">
                            <span v-if="isReferenceObject(row.schema)" class="ro-text ref-path">
                                {{ (row.schema as ReferenceObject).$ref }}
                            </span>
                            <span v-else class="ro-text">{{ (row.schema as any).description ?? '' }}</span>
                        </template>
                    </template>
                </el-table-column>
                <el-table-column label="" width="44" align="center">
                    <template #default="{ row }">
                        <el-button v-if="!row._expansion && isExpandable(row.schema)" size="small" text
                            :icon="expandedNames[row.name] ? ArrowDown : ArrowRight"
                            @click="toggleExpanded(row.name)" />
                    </template>
                </el-table-column>
            </el-table>
        </template>

        <!-- ── top-level array ───────────────────────────────────────────── -->
        <template v-else-if="(s as any).type === 'array'">
            <div class="array-label">Array items:</div>
            <SchemaViewer v-if="arrayItems" :schema="arrayItems" :level="lv + 1" :doc="effectiveDoc" />
            <span v-else class="ro-text">（未定义 items）</span>
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
                        <SchemaViewer :schema="item" :level="lv + 1" :doc="effectiveDoc" />
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
                    <el-tag v-for="v in (s as any).enum" :key="String(v)" size="small" style="margin:2px">{{ v }}</el-tag>
                </el-form-item>
            </el-form>
        </template>

    </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { ArrowDown, ArrowRight } from '@element-plus/icons-vue';
import { useDocStore } from '../store/useDocStore';
import type { SchemaObject, ReferenceObject, OpenApiDoc } from '@shared/types';
import { isReferenceObject, getObjectByRef } from '../utils/resolve';
import { usePropertyRows } from '../composables/usePropertyRows';

const props = defineProps<{
    schema: SchemaObject | ReferenceObject;
    level?: number;
    /** Optional doc override; if omitted, falls back to useDocStore().doc */
    doc?: OpenApiDoc;
}>();

const lv = computed(() => props.level ?? 0);
const docStore = useDocStore();
const effectiveDoc = computed(() => props.doc ?? docStore.doc as OpenApiDoc);

// ── $ref handling ─────────────────────────────────────────────────────────────
const isRef = computed(() => isReferenceObject(props.schema));
const refStr = computed(() => (props.schema as ReferenceObject).$ref ?? '');

const resolvedRef = computed((): SchemaObject | ReferenceObject | null => {
    if (!isRef.value) { return null; }
    try { return getObjectByRef(effectiveDoc.value, refStr.value) as SchemaObject; } catch { return null; }
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

function refShortName(schema: SchemaObject | ReferenceObject): string {
    if (!isReferenceObject(schema)) { return ''; }
    const parts = (schema as ReferenceObject).$ref.split('/');
    return parts[parts.length - 1] ?? '$ref';
}

// Treat schema as non-ref SchemaObject for convenience
const s = computed(() => props.schema as SchemaObject);

// ── Property rows (via composable) ────────────────────────────────────────────
const { expandedNames, displayRows, spanMethod, toggleExpanded } = usePropertyRows(
    () => (s.value as any).properties ?? {},
    6,
);

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
    const so = schema as any;
    if (so.type === 'array' && so.items) {
        const itemsType = isReferenceObject(so.items) ? refShortName(so.items) : (so.items as any).type;
        return `array<${itemsType ?? '?'}>`;
    }
    return String(so.type ?? '');
}

// ── Array items ───────────────────────────────────────────────────────────────
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

.ro-text {
    font-size: 12px;
    padding: 0 4px;
    color: var(--vscode-foreground, #333);
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.required-tag {
    flex-shrink: 0;
}

.ref-type-tag {
    font-family: monospace;
}

.ref-path {
    font-family: monospace;
    font-size: 11px;
    opacity: 0.75;
}

.ref-block {
    border: 1px solid var(--vscode-panel-border, #e4e7ed);
    border-radius: 4px;
    padding: 8px;
    margin-top: 4px;
}

.ref-block-label {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    font-size: 12px;
}

.ref-block-arrow {
    color: var(--vscode-textLink-foreground, #409eff);
}

.ref-block-name {
    font-weight: 600;
    font-family: monospace;
}

.ref-block-type {
    color: var(--vscode-descriptionForeground, #888);
    font-size: 11px;
}

.ref-unresolved {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px;
    color: #e6a23c;
    font-size: 12px;
}

.ref-unresolved-text {
    font-family: monospace;
    font-size: 11px;
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

.array-label {
    font-size: 11px;
    color: var(--vscode-descriptionForeground, #888);
    margin-bottom: 4px;
}

.prop-expansion-block {
    padding: 8px 8px 8px 16px;
    border-left: 2px solid var(--vscode-panel-border, #e4e7ed);
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

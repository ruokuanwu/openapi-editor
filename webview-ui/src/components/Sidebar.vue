<template>
    <aside class="sidebar">
        <!-- API Info header -->
        <div class="api-info" v-if="docStore.doc">
            <div class="api-info-title">{{ docStore.doc.info.title }}</div>
            <div class="api-info-version">v{{ docStore.doc.info.version }}</div>
        </div>

        <!-- Scrollable list -->
        <el-scrollbar class="sidebar-scroll">

            <!-- ── Endpoints Section ────────────────────────────────── -->
            <div class="section">
                <div class="section-header" @click="toggleSection('endpoints')">
                    <el-icon class="section-arrow">
                        <ArrowDown v-if="!sectionCollapsed.endpoints" />
                        <ArrowRight v-else />
                    </el-icon>
                    <span class="section-title">接口</span>
                    <div class="section-actions" @click.stop>
                        <el-tooltip content="新增 Tag" placement="top" :show-after="600">
                            <el-icon class="section-action-btn" @click="showAddTag = true">
                                <CollectionTag />
                            </el-icon>
                        </el-tooltip>
                        <el-tooltip content="新增接口" placement="top" :show-after="600">
                            <el-icon class="section-action-btn" @click="showAddEndpoint = true">
                                <Plus />
                            </el-icon>
                        </el-tooltip>
                    </div>
                </div>

                <div v-show="!sectionCollapsed.endpoints">
                    <div v-if="docStore.endpointGroups.length === 0" class="sidebar-empty">
                        暂无接口
                    </div>

                    <div v-for="group in docStore.endpointGroups" :key="group.tag" class="group">
                        <!-- Group header -->
                        <div class="group-header" @click="toggleGroup(group.tag)">
                            <el-icon class="group-arrow">
                                <ArrowDown v-if="!collapsed[group.tag]" />
                                <ArrowRight v-else />
                            </el-icon>
                            <span class="group-name">{{ group.tag }}</span>
                            <span class="group-count">{{ group.endpoints.length }}</span>
                        </div>

                        <!-- Endpoints -->
                        <div v-show="!collapsed[group.tag]" class="group-endpoints">
                            <div v-for="ep in group.endpoints" :key="`${ep.method}:${ep.path}`"
                                class="endpoint-item"
                                :class="{ active: isEndpointSelected(ep.path, ep.method) }"
                                @click="docStore.selectEndpoint(ep.path, ep.method)">
                                <span class="method-badge" :class="`method-${ep.method}`">
                                    {{ ep.method.toUpperCase() }}
                                </span>
                                <span class="endpoint-path" :title="ep.path">{{ ep.path }}</span>
                                <el-icon class="delete-icon" @click.stop="removeEndpoint(ep.path, ep.method)" title="删除">
                                    <Close />
                                </el-icon>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ── Components Section ───────────────────────────────── -->
            <div class="section">
                <div class="section-header" @click="toggleSection('components')">
                    <el-icon class="section-arrow">
                        <ArrowDown v-if="!sectionCollapsed.components" />
                        <ArrowRight v-else />
                    </el-icon>
                    <span class="section-title">组件</span>
                </div>

                <div v-show="!sectionCollapsed.components">
                    <!-- schemas -->
                    <ComponentGroup
                        label="Schemas"
                        type="schemas"
                        :names="componentNames('schemas')"
                        @add="openAddComponent('schemas')"
                        @select="(name) => docStore.selectComponent('schemas', name)"
                        @remove="(name) => removeComponent('schemas', name)"
                        :selected-name="docStore.selectedComponentType === 'schemas' ? docStore.selectedComponentName : null"
                    />
                    <!-- responses -->
                    <ComponentGroup
                        label="Responses"
                        type="responses"
                        :names="componentNames('responses')"
                        @add="openAddComponent('responses')"
                        @select="(name) => docStore.selectComponent('responses', name)"
                        @remove="(name) => removeComponent('responses', name)"
                        :selected-name="docStore.selectedComponentType === 'responses' ? docStore.selectedComponentName : null"
                    />
                    <!-- parameters -->
                    <ComponentGroup
                        label="Parameters"
                        type="parameters"
                        :names="componentNames('parameters')"
                        @add="openAddComponent('parameters')"
                        @select="(name) => docStore.selectComponent('parameters', name)"
                        @remove="(name) => removeComponent('parameters', name)"
                        :selected-name="docStore.selectedComponentType === 'parameters' ? docStore.selectedComponentName : null"
                    />
                    <!-- requestBodies -->
                    <ComponentGroup
                        label="Request Bodies"
                        type="requestBodies"
                        :names="componentNames('requestBodies')"
                        @add="openAddComponent('requestBodies')"
                        @select="(name) => docStore.selectComponent('requestBodies', name)"
                        @remove="(name) => removeComponent('requestBodies', name)"
                        :selected-name="docStore.selectedComponentType === 'requestBodies' ? docStore.selectedComponentName : null"
                    />
                </div>
            </div>

        </el-scrollbar>

        <!-- Add Endpoint Dialog -->
        <el-dialog v-model="showAddEndpoint" title="新增接口" width="420px" :append-to-body="true">
            <el-form :model="newEndpoint" label-width="60px" @submit.prevent>
                <el-form-item label="方法">
                    <el-select v-model="newEndpoint.method" style="width: 100%">
                        <el-option v-for="m in HTTP_METHODS" :key="m" :label="m.toUpperCase()" :value="m" />
                    </el-select>
                </el-form-item>
                <el-form-item label="路径">
                    <el-input v-model="newEndpoint.path" placeholder="/api/example"
                        @keydown.enter="confirmAddEndpoint" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showAddEndpoint = false">取消</el-button>
                <el-button type="primary" @click="confirmAddEndpoint">确定</el-button>
            </template>
        </el-dialog>

        <!-- Add Tag Dialog -->
        <el-dialog v-model="showAddTag" title="新增 Tag" width="380px" :append-to-body="true">
            <el-form :model="newTag" label-width="70px" @submit.prevent>
                <el-form-item label="名称">
                    <el-input v-model="newTag.name" placeholder="e.g. users" @keydown.enter="confirmAddTag" />
                </el-form-item>
                <el-form-item label="描述">
                    <el-input v-model="newTag.description" placeholder="可选" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showAddTag = false">取消</el-button>
                <el-button type="primary" @click="confirmAddTag">确定</el-button>
            </template>
        </el-dialog>

        <!-- Add Component Dialog -->
        <el-dialog v-model="showAddComponent" :title="`新增 ${addComponentTypeLabel}`" width="380px" :append-to-body="true">
            <el-form label-width="60px" @submit.prevent>
                <el-form-item label="名称">
                    <el-input v-model="newComponentName" placeholder="e.g. UserSchema"
                        @keydown.enter="confirmAddComponent" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showAddComponent = false">取消</el-button>
                <el-button type="primary" @click="confirmAddComponent">确定</el-button>
            </template>
        </el-dialog>
    </aside>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { Plus, Close, ArrowDown, ArrowRight, CollectionTag, Delete } from '@element-plus/icons-vue';
import { ElMessageBox } from 'element-plus';
import { useDocStore } from '../store/useDocStore';
import { HTTP_METHODS } from '../types';
import type { HttpMethod } from '../types';
import type { ComponentType } from '../store/useDocStore';
import ComponentGroup from './ComponentGroup.vue';

const docStore = useDocStore();

// ── Section collapse ─────────────────────────────────────────────────────────
const sectionCollapsed = reactive<Record<string, boolean>>({
    endpoints: false,
    components: false,
});

function toggleSection(key: string) {
    sectionCollapsed[key] = !sectionCollapsed[key];
}

// ── Group collapse state ─────────────────────────────────────────────────────
const collapsed = reactive<Record<string, boolean>>({});

function toggleGroup(tag: string) {
    collapsed[tag] = !collapsed[tag];
}

// ── Selection ────────────────────────────────────────────────────────────────
function isEndpointSelected(path: string, method: HttpMethod) {
    return docStore.selectedPath === path && docStore.selectedMethod === method;
}

// ── Remove endpoint ──────────────────────────────────────────────────────────
function removeEndpoint(path: string, method: HttpMethod) {
    ElMessageBox.confirm(`确认删除 ${method.toUpperCase()} ${path}？`, '删除接口', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
    }).then(() => {
        docStore.removeEndpoint(path, method);
    }).catch(() => {/* cancelled */ });
}

// ── Add endpoint ─────────────────────────────────────────────────────────────
const showAddEndpoint = ref(false);
const newEndpoint = reactive({ method: 'get' as HttpMethod, path: '' });

function confirmAddEndpoint() {
    const path = newEndpoint.path.trim();
    if (!path) { return; }
    docStore.addEndpoint(path.startsWith('/') ? path : `/${path}`, newEndpoint.method);
    newEndpoint.path = '';
    showAddEndpoint.value = false;
}

// ── Add tag ─────────────────────────────────────────────────────────────────
const showAddTag = ref(false);
const newTag = reactive({ name: '', description: '' });

function confirmAddTag() {
    const name = newTag.name.trim();
    if (!name) { return; }
    docStore.addTag({ name, description: newTag.description.trim() || undefined });
    newTag.name = '';
    newTag.description = '';
    showAddTag.value = false;
}

// ── Component helpers ────────────────────────────────────────────────────────
function componentNames(type: ComponentType): string[] {
    if (!docStore.doc?.components) { return []; }
    return Object.keys((docStore.doc.components[type] as Record<string, unknown>) ?? {});
}

function removeComponent(type: ComponentType, name: string) {
    ElMessageBox.confirm(`确认删除组件 "${name}"？`, '删除组件', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
    }).then(() => {
        docStore.removeComponent(type, name);
    }).catch(() => {/* cancelled */ });
}

// ── Add component ────────────────────────────────────────────────────────────
const showAddComponent = ref(false);
const newComponentName = ref('');
const currentAddType = ref<ComponentType>('schemas');

const addComponentTypeLabel = computed(() => {
    const labels: Record<ComponentType, string> = {
        schemas: 'Schema',
        responses: 'Response',
        parameters: 'Parameter',
        requestBodies: 'Request Body',
    };
    return labels[currentAddType.value];
});

function openAddComponent(type: ComponentType) {
    currentAddType.value = type;
    newComponentName.value = '';
    showAddComponent.value = true;
}

function confirmAddComponent() {
    const name = newComponentName.value.trim();
    if (!name) { return; }
    const defaults: Record<ComponentType, unknown> = {
        schemas: { type: 'object', properties: {} },
        responses: { description: '' },
        parameters: { name: '', in: 'query', schema: { type: 'string' } },
        requestBodies: { content: {} },
    };
    docStore.addComponent(currentAddType.value, name, defaults[currentAddType.value] as never);
    showAddComponent.value = false;
}
</script>

<style scoped>
.sidebar {
    width: 240px;
    min-width: 200px;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--vscode-panel-border, #e4e7ed);
    background: var(--vscode-sideBar-background, #f8f9fa);
    flex-shrink: 0;
    overflow: hidden;
}

.api-info {
    padding: 10px 12px 8px;
    border-bottom: 1px solid var(--vscode-panel-border, #e4e7ed);
}

.api-info-title {
    font-weight: 600;
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.api-info-version {
    font-size: 11px;
    opacity: 0.6;
    margin-top: 2px;
}

.sidebar-scroll {
    flex: 1;
}

.sidebar-empty {
    padding: 10px 16px;
    font-size: 12px;
    opacity: 0.6;
}

/* ── Section ─────────────────────────────────────────────── */
.section {
    border-bottom: 1px solid var(--vscode-panel-border, #e4e7ed);
}

.section-header {
    display: flex;
    align-items: center;
    padding: 5px 8px;
    cursor: pointer;
    gap: 4px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    user-select: none;
    background: var(--vscode-sideBarSectionHeader-background, #ebebeb);
}

.section-header:hover {
    background: var(--vscode-list-hoverBackground, #e0e0e0);
}

.section-arrow {
    font-size: 11px;
    flex-shrink: 0;
}

.section-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.section-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.15s;
}

.section-header:hover .section-actions {
    opacity: 1;
}

.section-action-btn {
    font-size: 13px;
    padding: 2px;
    border-radius: 3px;
    cursor: pointer;
}

.section-action-btn:hover {
    background: rgba(0, 0, 0, 0.1);
}

/* ── Group ── */
.group-header {
    display: flex;
    align-items: center;
    padding: 4px 10px;
    cursor: pointer;
    gap: 4px;
    font-size: 12px;
    font-weight: 600;
    user-select: none;
    background: var(--vscode-sideBar-background, #f8f9fa);
    border-bottom: 1px solid var(--vscode-panel-border, #e4e7ed);
}

.group-header:hover {
    background: var(--vscode-list-hoverBackground, #e0e0e0);
}

.group-arrow {
    font-size: 12px;
    flex-shrink: 0;
}

.group-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.group-count {
    font-size: 10px;
    background: rgba(0, 0, 0, 0.12);
    border-radius: 8px;
    padding: 0 5px;
    min-width: 16px;
    text-align: center;
}

/* ── Endpoint item ── */
.group-endpoints {
    background: var(--vscode-sideBar-background, #f8f9fa);
}

.endpoint-item {
    display: flex;
    align-items: center;
    padding: 4px 8px 4px 16px;
    gap: 6px;
    cursor: pointer;
    border-bottom: 1px solid transparent;
    font-size: 12px;
}

.endpoint-item:hover {
    background: var(--vscode-list-hoverBackground, #e5e5e5);
}

.endpoint-item.active {
    background: var(--vscode-list-activeSelectionBackground, #0078d4);
    color: var(--vscode-list-activeSelectionForeground, #fff);
}

.endpoint-path {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.delete-icon {
    font-size: 11px;
    opacity: 0;
    color: inherit;
    flex-shrink: 0;
}

.endpoint-item:hover .delete-icon {
    opacity: 0.5;
}

.endpoint-item:hover .delete-icon:hover {
    opacity: 1;
    color: #f93e3e;
}
</style>


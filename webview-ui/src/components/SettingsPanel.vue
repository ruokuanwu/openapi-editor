<template>
    <el-drawer v-model="visible" title="编辑器设置" direction="rtl" size="480px" :append-to-body="true"
        @close="$emit('update:visible', false)">
        <el-tabs v-model="activeTab">
            <!-- ── Environments ─────────────────────────────────── -->
            <el-tab-pane label="环境变量" name="env">
                <div class="tab-pane-content">
                    <div class="pane-toolbar">
                        <el-button size="small" :icon="Plus" type="primary" plain @click="addEnv">
                            新增环境
                        </el-button>
                    </div>

                    <el-collapse v-model="openEnv" accordion>
                        <el-collapse-item v-for="(env, idx) in config.environments" :key="env.id" :name="env.id">
                            <template #title>
                                <div style="display: flex; align-items: center; gap: 8px; width: 100%">
                                    <span>{{ env.name }}</span>
                                    <el-tag size="small" type="info">{{ env.baseUrl || '无 BaseURL' }}</el-tag>
                                </div>
                            </template>

                            <el-form :model="env" label-width="80px" size="small">
                                <el-form-item label="名称">
                                    <el-input v-model="env.name" />
                                </el-form-item>
                                <el-form-item label="Base URL">
                                    <el-input v-model="env.baseUrl" placeholder="https://api.example.com" />
                                </el-form-item>
                                <el-form-item label="变量">
                                    <div class="var-table">
                                        <div v-for="(v, vi) in env.variables" :key="vi" class="var-row">
                                            <el-input v-model="v.key" placeholder="KEY" style="flex: 1" size="small" />
                                            <el-input v-model="v.value" placeholder="VALUE" style="flex: 1"
                                                size="small" />
                                            <el-button type="danger" text size="small" :icon="Delete"
                                                @click="removeVar(env, vi)" />
                                        </div>
                                        <el-button size="small" :icon="Plus" plain style="margin-top: 4px"
                                            @click="addVar(env)">
                                            添加变量
                                        </el-button>
                                    </div>
                                </el-form-item>
                                <el-form-item>
                                    <el-button type="danger" size="small" plain @click="removeEnv(idx)">
                                        删除此环境
                                    </el-button>
                                </el-form-item>
                            </el-form>
                        </el-collapse-item>
                    </el-collapse>

                    <el-empty v-if="!config.environments.length" description="暂无环境" :image-size="60" />
                </div>
            </el-tab-pane>

            <!-- ── Auth ─────────────────────────────────────────── -->
            <el-tab-pane label="认证" name="auth">
                <div class="tab-pane-content">
                    <el-form :model="config.auth" label-width="90px" size="small">
                        <el-form-item label="认证类型">
                            <el-select v-model="config.auth.type" style="width: 160px">
                                <el-option label="无" value="none" />
                                <el-option label="Bearer Token" value="bearer" />
                                <el-option label="Basic Auth" value="basic" />
                                <el-option label="API Key" value="apikey" />
                            </el-select>
                        </el-form-item>

                        <template v-if="config.auth.type === 'bearer'">
                            <el-form-item label="Token">
                                <el-input :model-value="config.auth.bearer?.token ?? ''"
                                    @update:model-value="(v: string) => setBearer(v)" type="password" show-password
                                    placeholder="Bearer token" />
                            </el-form-item>
                        </template>

                        <template v-if="config.auth.type === 'basic'">
                            <el-form-item label="用户名">
                                <el-input :model-value="config.auth.basic?.username ?? ''"
                                    @update:model-value="(v: string) => setBasic('username', v)" />
                            </el-form-item>
                            <el-form-item label="密码">
                                <el-input :model-value="config.auth.basic?.password ?? ''"
                                    @update:model-value="(v: string) => setBasic('password', v)" type="password"
                                    show-password />
                            </el-form-item>
                        </template>

                        <template v-if="config.auth.type === 'apikey'">
                            <el-form-item label="键名">
                                <el-input :model-value="config.auth.apikey?.key ?? ''"
                                    @update:model-value="(v: string) => setApiKey('key', v)"
                                    placeholder="e.g. X-API-Key" />
                            </el-form-item>
                            <el-form-item label="值">
                                <el-input :model-value="config.auth.apikey?.value ?? ''"
                                    @update:model-value="(v: string) => setApiKey('value', v)" type="password"
                                    show-password />
                            </el-form-item>
                            <el-form-item label="传递位置">
                                <el-select :model-value="config.auth.apikey?.in ?? 'header'"
                                    @update:model-value="(v: 'header' | 'query') => setApiKey('in', v)"
                                    style="width: 120px">
                                    <el-option label="Header" value="header" />
                                    <el-option label="Query" value="query" />
                                </el-select>
                            </el-form-item>
                        </template>
                    </el-form>
                </div>
            </el-tab-pane>

            <!-- ── Mock ──────────────────────────────────────────── -->
            <el-tab-pane label="Mock" name="mock">
                <div class="tab-pane-content">
                    <el-form :model="config.mock" label-width="80px" size="small">
                        <el-form-item label="启用 Mock">
                            <el-switch v-model="config.mock.enabled" />
                        </el-form-item>
                        <el-form-item label="延迟 (ms)">
                            <el-input-number v-model="config.mock.delay" :min="0" :max="10000" :step="100"
                                style="width: 140px" />
                        </el-form-item>
                    </el-form>

                    <div class="pane-toolbar" style="margin-top: 16px">
                        <span style="font-weight: 600; font-size: 13px">Mock 规则</span>
                        <el-button size="small" :icon="Plus" plain @click="addMockRule">
                            添加规则
                        </el-button>
                    </div>

                    <el-table :data="config.mock.rules" border size="small" style="width: 100%; margin-top: 8px">
                        <el-table-column label="方法" width="90">
                            <template #default="{ row }">
                                <el-input v-model="row.method" size="small" placeholder="GET" />
                            </template>
                        </el-table-column>
                        <el-table-column label="路径" min-width="120">
                            <template #default="{ row }">
                                <el-input v-model="row.path" size="small" placeholder="/api/..." />
                            </template>
                        </el-table-column>
                        <el-table-column label="状态码" width="80">
                            <template #default="{ row }">
                                <el-input-number v-model="row.status" :min="100" :max="599" size="small"
                                    :controls="false" style="width: 70px" />
                            </template>
                        </el-table-column>
                        <el-table-column label="" width="44" align="center">
                            <template #default="{ $index }">
                                <el-button size="small" type="danger" text :icon="Delete"
                                    @click="config.mock.rules.splice($index, 1)" />
                            </template>
                        </el-table-column>
                    </el-table>

                    <el-empty v-if="!config.mock.rules.length" description="暂无规则" :image-size="50" />
                </div>
            </el-tab-pane>
        </el-tabs>

        <template #footer>
            <el-button type="primary" @click="saveSettings">保存设置</el-button>
            <el-button @click="$emit('update:visible', false)">关闭</el-button>
        </template>
    </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus, Delete } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useConfigStore } from '../store/useConfigStore';
import vscode from '../vscode';
import type { Environment, EnvVariable } from '../types';

defineProps<{ visible: boolean }>();
const emit = defineEmits<{
    (e: 'update:visible', v: boolean): void;
}>();

const configStore = useConfigStore();
const config = computed(() => configStore.config);
const activeTab = ref('env');
const openEnv = ref('');

// ── Environments ─────────────────────────────────────────────────────────────
function addEnv() {
    configStore.config.environments.push({
        id: `env-${Date.now()}`,
        name: '新环境',
        baseUrl: '',
        variables: [],
    });
}

function removeEnv(idx: number) {
    configStore.config.environments.splice(idx, 1);
}

function addVar(env: Environment) {
    env.variables.push({ key: '', value: '' });
}

function removeVar(env: Environment, idx: number) {
    env.variables.splice(idx, 1);
}

// ── Auth helpers ─────────────────────────────────────────────────────────────
function setBearer(token: string) {
    configStore.config.auth.bearer = { token };
}

function setBasic(field: 'username' | 'password', value: string) {
    if (!configStore.config.auth.basic) {
        configStore.config.auth.basic = { username: '', password: '' };
    }
    configStore.config.auth.basic[field] = value;
}

function setApiKey(field: 'key' | 'value' | 'in', value: string) {
    if (!configStore.config.auth.apikey) {
        configStore.config.auth.apikey = { key: '', value: '', in: 'header' };
    }
    (configStore.config.auth.apikey as Record<string, string>)[field] = value;
}

// ── Mock helpers ─────────────────────────────────────────────────────────────
function addMockRule() {
    configStore.config.mock.rules.push({
        id: `rule-${Date.now()}`,
        path: '/',
        method: 'GET',
        status: 200,
        response: {},
    });
}

// ── Persist ──────────────────────────────────────────────────────────────────
function saveSettings() {
    vscode.postMessage({ type: 'updateConfig', config: configStore.config });
    ElMessage.success('设置已保存至 .openapi-editor');
    emit('update:visible', false);
}
</script>

<style scoped>
.tab-pane-content {
    padding: 8px 0;
}

.pane-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}

.var-table {
    width: 100%;
}

.var-row {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-bottom: 4px;
}
</style>

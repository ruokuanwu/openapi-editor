<template>
    <div class="run-result-panel">
        <!-- Panel Header -->
        <div class="rp-header">
            <span class="rp-title">响应结果</span>
        </div>

        <!-- Loading skeleton -->
        <div v-if="runStore.loading" class="rp-body">
            <el-skeleton :rows="6" animated />
        </div>

        <!-- Error state -->
        <div v-else-if="runStore.result?.error" class="rp-body">
            <el-alert
                :title="runStore.result.error"
                type="error"
                :closable="false"
                show-icon
            />
        </div>

        <!-- Result content -->
        <div v-else-if="runStore.result" class="rp-body">
            <!-- Request section -->
            <div class="rp-section">
                <div class="rp-section-title">请求</div>

                <!-- Method + URL -->
                <div class="rp-url-row">
                    <span :class="['method-badge', `method-${runStore.result.request.method.toLowerCase()}`]">
                        {{ runStore.result.request.method.toUpperCase() }}
                    </span>
                    <span class="rp-url">{{ runStore.result.request.url }}</span>
                </div>

                <!-- Request Headers -->
                <el-collapse v-if="reqHeaderEntries.length > 0" class="rp-collapse">
                    <el-collapse-item title="Headers" name="req-headers">
                        <table class="kv-table">
                            <tr v-for="[k, v] in reqHeaderEntries" :key="k">
                                <td class="kv-key">{{ k }}</td>
                                <td class="kv-val">{{ v }}</td>
                            </tr>
                        </table>
                    </el-collapse-item>
                </el-collapse>

                <!-- Request Body -->
                <el-collapse v-if="runStore.result.request.body" class="rp-collapse">
                    <el-collapse-item title="Body" name="req-body">
                        <pre class="code-block">{{ runStore.result.request.body }}</pre>
                    </el-collapse-item>
                </el-collapse>
            </div>

            <!-- Response section -->
            <div v-if="runStore.result.response" class="rp-section">
                <div class="rp-section-title">响应</div>

                <!-- Status + duration -->
                <div class="rp-status-row">
                    <span :class="['status-badge', statusClass]">
                        {{ runStore.result.response.status }} {{ runStore.result.response.statusText }}
                    </span>
                    <span class="rp-duration">{{ runStore.result.response.duration }}ms</span>
                </div>

                <!-- Response Headers -->
                <el-collapse v-if="resHeaderEntries.length > 0" class="rp-collapse">
                    <el-collapse-item title="Headers" name="res-headers">
                        <table class="kv-table">
                            <tr v-for="[k, v] in resHeaderEntries" :key="k">
                                <td class="kv-key">{{ k }}</td>
                                <td class="kv-val">{{ v }}</td>
                            </tr>
                        </table>
                    </el-collapse-item>
                </el-collapse>

                <!-- Response Body -->
                <el-collapse v-if="runStore.result.response.body" class="rp-collapse">
                    <el-collapse-item title="Body" name="res-body">
                        <pre class="code-block">{{ formattedBody }}</pre>
                    </el-collapse-item>
                </el-collapse>
            </div>
        </div>

        <!-- Empty state (panel open but no run yet) -->
        <div v-else class="rp-empty">
            <el-empty description="点击「发送」发送请求" :image-size="60" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRunStore } from '../store/useRunStore';

const runStore = useRunStore();

const reqHeaderEntries = computed(() =>
    Object.entries(runStore.result?.request.headers ?? {})
);

const resHeaderEntries = computed(() =>
    Object.entries(runStore.result?.response?.headers ?? {})
);

const statusClass = computed(() => {
    const status = runStore.result?.response?.status ?? 0;
    if (status >= 200 && status < 300) { return 'status-2xx'; }
    if (status >= 400 && status < 500) { return 'status-4xx'; }
    if (status >= 500) { return 'status-5xx'; }
    return 'status-other';
});

const formattedBody = computed(() => {
    const body = runStore.result?.response?.body ?? '';
    try {
        return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
        return body;
    }
});
</script>

<style scoped>
.run-result-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    border-left: 1px solid var(--vscode-panel-border, #e4e7ed);
    background: var(--vscode-editor-background, #fff);
}

/* ── Header ── */
.rp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--vscode-panel-border, #e4e7ed);
    background: var(--vscode-sideBar-background, #f5f5f5);
    flex-shrink: 0;
}

.rp-title {
    font-weight: 600;
    font-size: 13px;
}

/* ── Body ── */
.rp-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.rp-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* ── Sections ── */
.rp-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.rp-section-title {
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--vscode-descriptionForeground, #888);
    padding-bottom: 4px;
    border-bottom: 1px solid var(--vscode-panel-border, #e4e7ed);
}

/* ── URL row ── */
.rp-url-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.rp-url {
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px;
    word-break: break-all;
}

/* ── Status row ── */
.rp-status-row {
    display: flex;
    align-items: center;
    gap: 10px;
}

.status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 700;
}

.status-2xx {
    background: #e6f9ee;
    color: #1a7a3a;
    border: 1px solid #a3d9b1;
}

.status-4xx {
    background: #fff4e6;
    color: #a55a00;
    border: 1px solid #f7c88c;
}

.status-5xx {
    background: #fff1f1;
    color: #c62828;
    border: 1px solid #f4a0a0;
}

.status-other {
    background: var(--vscode-textCodeBlock-background, #f0f0f0);
    color: var(--vscode-foreground, #333);
}

.rp-duration {
    font-size: 12px;
    color: var(--vscode-descriptionForeground, #888);
}

/* ── Collapse ── */
.rp-collapse {
    border: 1px solid var(--vscode-panel-border, #e4e7ed) !important;
    border-radius: 4px;
}

.rp-collapse :deep(.el-collapse-item__header) {
    padding: 0 10px;
    font-size: 12px;
    height: 32px;
    line-height: 32px;
}

.rp-collapse :deep(.el-collapse-item__content) {
    padding: 8px 10px;
}

/* ── KV table ── */
.kv-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
}

.kv-table tr:not(:last-child) td {
    border-bottom: 1px solid var(--vscode-panel-border, #e4e7ed);
}

.kv-key {
    font-weight: 600;
    padding: 3px 8px 3px 0;
    white-space: nowrap;
    color: var(--vscode-descriptionForeground, #555);
    width: 40%;
    word-break: break-all;
}

.kv-val {
    padding: 3px 0;
    word-break: break-all;
    font-family: var(--vscode-editor-font-family, monospace);
}

/* ── Code block ── */
.code-block {
    margin: 0;
    font-size: 12px;
    font-family: var(--vscode-editor-font-family, monospace);
    white-space: pre-wrap;
    word-break: break-all;
    background: var(--vscode-textCodeBlock-background, #f5f5f5);
    padding: 8px;
    border-radius: 4px;
    max-height: 300px;
    overflow-y: auto;
}

/* ── Dark overrides ── */
html.dark .status-2xx {
    background: #1a3d2a;
    color: #a6e3a1;
    border-color: #2a6040;
}

html.dark .status-4xx {
    background: #3d2a10;
    color: #fab387;
    border-color: #6a4020;
}

html.dark .status-5xx {
    background: #3d1010;
    color: #f38ba8;
    border-color: #6a2020;
}
</style>

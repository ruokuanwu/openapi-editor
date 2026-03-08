<template>
    <div class="app-root">
        <Toolbar @open-settings="showSettings = true" />
        <div class="app-body">
            <Sidebar />
            <main class="app-main">
                <EndpointEditor v-if="docStore.selectedPath && docStore.selectedMethod" />
                <div v-else-if="docStore.doc" class="app-empty">
                    <el-empty description="从左侧选择一个接口开始编辑" :image-size="80" />
                </div>
                <div v-else class="app-empty">
                    <el-empty description="正在加载..." :image-size="80" />
                </div>
            </main>
        </div>
        <SettingsPanel v-model:visible="showSettings" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import vscode from './vscode';
import { useDocStore } from './store/useDocStore';
import { useConfigStore } from './store/useConfigStore';
import Toolbar from './components/Toolbar.vue';
import Sidebar from './components/Sidebar.vue';
import EndpointEditor from './components/EndpointEditor.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import type { ExtToWebviewMessage } from './types';

const docStore = useDocStore();
const configStore = useConfigStore();
const showSettings = ref(false);

onMounted(() => {
    // Receive messages from the extension host
    window.addEventListener('message', (event: MessageEvent<ExtToWebviewMessage>) => {
        const msg = event.data;
        if (msg.type === 'init') {
            docStore.setDoc(msg.doc);
            configStore.setConfig(msg.config);
        } else if (msg.type === 'docChanged') {
            docStore.setDoc(msg.doc);
        }
    });

    // Ctrl+S / Cmd+S → save
    window.addEventListener('keydown', (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (docStore.doc) {
                vscode.postMessage({ type: 'save', doc: docStore.doc });
            }
        }
    });

    // Signal the extension host that we are ready
    vscode.postMessage({ type: 'ready' });
});
</script>

<style>
/* ── Global resets ──────────────────────────────────────────────────── */
*,
*::before,
*::after {
    box-sizing: border-box;
}

html,
body,
#app {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
}

body {
    font-family: var(--vscode-font-family, 'Segoe UI', system-ui, sans-serif);
    font-size: var(--vscode-font-size, 13px);
    background: var(--vscode-editor-background, #fff);
    color: var(--vscode-foreground, #333);
}

/* ── Layout ─────────────────────────────────────────────────────────── */
.app-root {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
}

.app-body {
    display: flex;
    flex: 1;
    overflow: hidden;
}

.app-main {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    background: var(--vscode-editor-background, #fff);
}

.app-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
}

/* ── Method badge colors ─────────────────────────────────────────────── */
.method-badge {
    display: inline-block;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
    min-width: 50px;
    text-align: center;
    color: #fff;
    flex-shrink: 0;
}

.method-get {
    background: #61affe;
}

.method-post {
    background: #49cc90;
}

.method-put {
    background: #fca130;
}

.method-delete {
    background: #f93e3e;
}

.method-patch {
    background: #50e3c2;
    color: #333;
}

.method-options {
    background: #0d5aa7;
}

.method-head {
    background: #9012fe;
}

.method-trace {
    background: #785446;
}

/* ── Element Plus light overrides ───────────────────────────────────── */
.el-input__wrapper {
    background-color: var(--vscode-input-background, #fff) !important;
}

.el-input__inner {
    color: var(--vscode-input-foreground, #333) !important;
}
</style>

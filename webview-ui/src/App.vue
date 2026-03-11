<template>
    <div class="app-root">
        <Toolbar @open-settings="showSettings = true" />
        <div class="app-body">
            <Sidebar />
            <main class="app-main">
                <div class="editor-pane">
                    <EndpointEditor v-if="docStore.selectedPath && docStore.selectedMethod" />
                    <ComponentEditor v-else-if="docStore.selectedComponentName" />
                    <div v-else-if="docStore.doc" class="app-empty">
                        <el-empty description="从左侧选择一个接口或组件开始编辑" :image-size="80" />
                    </div>
                    <div v-else class="app-empty">
                        <el-empty description="正在加载..." :image-size="80" />
                    </div>
                </div>

            </main>
        </div>
        <SettingsPanel v-model:visible="showSettings" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, toRaw } from 'vue';
import vscode from './vscode';
import { useDocStore } from './store/useDocStore';
import { useConfigStore } from './store/useConfigStore';
import { useRunStore } from './store/useRunStore';
import Toolbar from './components/Toolbar.vue';
import Sidebar from './components/Sidebar.vue';
import EndpointEditor from './components/EndpointEditor.vue';
import ComponentEditor from './components/ComponentEditor.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import type { ExtToWebviewMessage } from './types';

const docStore = useDocStore();
const configStore = useConfigStore();
const runStore = useRunStore();
const showSettings = ref(false);

function applyTheme(theme: string | undefined) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

watch(() => configStore.config.theme, (theme) => {
    applyTheme(theme);
});

onMounted(() => {
    // Receive messages from the extension host
    window.addEventListener('message', (event: MessageEvent<ExtToWebviewMessage>) => {
        const msg = event.data;
        if (msg.type === 'init') {
            docStore.setDoc(msg.doc);
            configStore.setConfig(msg.config);
            applyTheme(msg.config.theme);
        } else if (msg.type === 'configUpdated') {
            configStore.setConfig(msg.config);
            applyTheme(msg.config.theme);
        } else if (msg.type === 'docChanged') {
            docStore.setDoc(msg.doc);
        } else if (msg.type === 'runResponse') {
            runStore.handleResponse(msg);
        } else if (msg.type === 'runError') {
            runStore.handleError(msg.id, msg.error);
        }
    });

    // Ctrl+S / Cmd+S → save
    window.addEventListener('keydown', (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (docStore.doc) {
                vscode.postMessage({ type: 'save', doc: toRaw(docStore.doc )});
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
    overflow: hidden;
    display: flex;
    flex-direction: row;
    background: var(--vscode-editor-background, #fff);
}

.editor-pane {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    min-width: 0;
    display: flex;
    flex-direction: column;
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

/* ══ Dark theme ════════════════════════════════════════════════════════
   Palette: Catppuccin Mocha (https://catppuccin.com/)
   ────────────────────────────────────────────────────────────────── */
html.dark {
    color-scheme: dark;

    /* ── Layout backgrounds ── */
    --vscode-editor-background:              #1e1e2e;
    --vscode-sideBar-background:             #181825;
    --vscode-sideBarSectionHeader-background:#11111b;
    --vscode-panel-border:                   #313244;

    /* ── Text ── */
    --vscode-foreground:                     #cdd6f4;
    --vscode-descriptionForeground:          #a6adc8;

    /* ── Inputs ── */
    --vscode-input-background:               #313244;
    --vscode-input-foreground:               #cdd6f4;
    --vscode-input-border:                   #45475a;
    --vscode-input-placeholderForeground:    #6c7086;

    /* ── Lists ── */
    --vscode-list-hoverBackground:           #313244;
    --vscode-list-activeSelectionBackground: #89b4fa;
    --vscode-list-activeSelectionForeground: #1e1e2e;

    /* ── Buttons ── */
    --vscode-button-background:              #89b4fa;
    --vscode-button-foreground:              #1e1e2e;

    /* ── Code ── */
    --vscode-textCodeBlock-background:       #313244;

    /* ── Body reset ── */
    background: #1e1e2e;
    color: #cdd6f4;
}

/* Element Plus component overrides for dark mode */
html.dark .el-input__wrapper {
    background-color: #313244 !important;
    box-shadow: 0 0 0 1px #45475a inset !important;
}

html.dark .el-input__inner {
    color: #cdd6f4 !important;
}

html.dark .el-textarea__inner {
    background-color: #313244 !important;
    color: #cdd6f4 !important;
    box-shadow: 0 0 0 1px #45475a inset !important;
}

html.dark .el-select .el-input__wrapper {
    background-color: #313244 !important;
}

html.dark .el-select-dropdown {
    background-color: #1e1e2e !important;
    border-color: #45475a !important;
}

html.dark .el-select-dropdown__item {
    color: #cdd6f4 !important;
}

html.dark .el-select-dropdown__item.is-hovering,
html.dark .el-select-dropdown__item:hover {
    background-color: #313244 !important;
}

html.dark .el-select-dropdown__item.is-selected {
    color: #89b4fa !important;
}

html.dark .el-form-item__label {
    color: #a6adc8 !important;
}

html.dark .el-collapse-item__header {
    background-color: #181825 !important;
    color: #cdd6f4 !important;
    border-color: #313244 !important;
}

html.dark .el-collapse-item__wrap {
    background-color: #1e1e2e !important;
    border-color: #313244 !important;
}

html.dark .el-tag {
    background-color: #313244;
    border-color: #45475a;
    color: #cdd6f4;
}

html.dark .el-tag--info {
    background-color: #2a2a3d;
    border-color: #45475a;
    color: #a6adc8;
}

html.dark .el-empty__description p {
    color: #6c7086 !important;
}

/* Disable Element Plus table row enter/leave animation */
.el-list-enter-active,
.el-list-leave-active {
    transition: none !important;
}
.el-list-enter-from,
.el-list-leave-to {
    opacity: 1 !important;
    transform: none !important;
}

html.dark .el-table {
    background-color: #1e1e2e !important;
    color: #cdd6f4 !important;
}

html.dark .el-table th,
html.dark .el-table td {
    background-color: #1e1e2e !important;
    border-color: #313244 !important;
}

html.dark .el-table__row:hover > td {
    background-color: #313244 !important;
}

html.dark .el-drawer {
    background-color: #1e1e2e !important;
}

html.dark .el-drawer__header {
    color: #cdd6f4 !important;
    border-bottom-color: #313244 !important;
    margin-bottom: 0 !important;
    padding-bottom: 16px !important;
}

html.dark .el-tabs__item {
    color: #a6adc8 !important;
}

html.dark .el-tabs__item.is-active {
    color: #89b4fa !important;
}

html.dark .el-tabs__active-bar {
    background-color: #89b4fa !important;
}

html.dark .el-tabs__nav-wrap::after {
    background-color: #313244 !important;
}

html.dark .el-button--primary {
    background-color: #89b4fa !important;
    border-color: #89b4fa !important;
    color: #1e1e2e !important;
}

html.dark .el-button--primary:hover {
    background-color: #b4befe !important;
    border-color: #b4befe !important;
}

html.dark .el-button--default {
    background-color: #313244 !important;
    border-color: #45475a !important;
    color: #cdd6f4 !important;
}

html.dark .el-button--default:hover {
    background-color: #45475a !important;
    border-color: #585b70 !important;
}

/* ── Dark mode: HTTP method badge colors (vivid for contrast) ── */
html.dark .method-get    { background: #2d6a9f; color: #89dceb; border: 1px solid #3a90c6; }
html.dark .method-post   { background: #1a5e3a; color: #a6e3a1; border: 1px solid #3a8a58; }
html.dark .method-put    { background: #7a4e1a; color: #fab387; border: 1px solid #a06030; }
html.dark .method-delete { background: #6e1a1a; color: #f38ba8; border: 1px solid #a03030; }
html.dark .method-patch  { background: #1a5c5c; color: #94e2d5; border: 1px solid #2a8a82; }
html.dark .method-options{ background: #3a2a6e; color: #cba6f7; border: 1px solid #5a4090; }
html.dark .method-head   { background: #5c2a5c; color: #f5c2e7; border: 1px solid #8a4080; }
html.dark .method-trace  { background: #3a3010; color: #f9e2af; border: 1px solid #6a5820; }
</style>

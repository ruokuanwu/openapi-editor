<template>
    <div class="run-tab-layout" ref="runTabLayout">
        <EndpointRunInstance class="run-instance-pane" :style="{ width: runPaneWidth + 'px' }" />
        <div class="run-resizer" @mousedown.prevent="onRunResizerMousedown" />
        <EndpointRunResult class="run-result-pane" />
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import EndpointRunInstance from './EndpointRunInstance.vue';
import EndpointRunResult from './EndpointRunResult.vue';

const runTabLayout = ref<HTMLElement | null>(null);
const runPaneWidth = ref(380);

function onRunResizerMousedown(e: MouseEvent) {
    const startX = e.clientX;
    const startWidth = runPaneWidth.value;

    function onMouseMove(mv: MouseEvent) {
        runPaneWidth.value = Math.min(800, Math.max(200, startWidth + (mv.clientX - startX)));
    }

    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}
</script>

<style scoped>
.run-tab-layout {
    display: flex;
    height: 100%;
    overflow: hidden;
    gap: 0;
}

.run-instance-pane {
    flex-shrink: 0;
    overflow: hidden;
}

.run-result-pane {
    flex: 1;
    min-width: 0;
    overflow: hidden;
}

.run-resizer {
    width: 4px;
    cursor: col-resize;
    background: var(--vscode-panel-border, #e4e7ed);
    flex-shrink: 0;
}

.run-resizer:hover {
    background: var(--vscode-focusBorder, #0078d4);
}
</style>

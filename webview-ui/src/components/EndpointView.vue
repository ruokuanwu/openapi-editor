<template>
    <div class="endpoint-editor" v-if="docStore.selectedOperation && docStore.selectedPath && docStore.selectedMethod">

        <!-- Outer tabs: Detail | Run -->
        <el-tabs v-model="runStore.activeMainTab" class="outer-tabs">

            <!-- ── Tab 1: Detail (view / edit) ───────────────────────── -->
            <el-tab-pane name="edit">
                <template #label>
                    <span>详情</span>
                </template>
                <EndpointDetail />
            </el-tab-pane>

            <!-- ── Tab 2: Run (instance) ─────────────────────────────── -->
            <el-tab-pane name="run">
                <template #label>
                    <span>运行</span>
                </template>
                <EndpointRun />
            </el-tab-pane>

        </el-tabs>
    </div>
</template>

<script setup lang="ts">
import { useDocStore } from '../store/useDocStore';
import { useRunStore } from '../store/useRunStore';
import EndpointDetail from './EndpointDetail.vue';
import EndpointRun from './EndpointRun.vue';

const docStore = useDocStore();
const runStore = useRunStore();
</script>

<style scoped>
.endpoint-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
}

/* ── Outer tabs ──────────────────────────────────────────────────────── */
.outer-tabs {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

:deep(.outer-tabs > .el-tabs__header) {
    margin-bottom: 0;
    flex-shrink: 0;
}

:deep(.outer-tabs > .el-tabs__content) {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 0;
}

:deep(.outer-tabs > .el-tabs__content > .el-tab-pane) {
    display: flex;
    flex-direction: column;
    height: 100%;
}
</style>

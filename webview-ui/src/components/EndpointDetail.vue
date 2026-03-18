<template>
    <div class="detail-pane">
        <EndpointDetailViewer v-if="!isEditing" @start-edit="onStartEdit" />
        <EndpointDetailEditor v-else @save="onSave" @cancel="onCancel" />
    </div>
</template>

<script setup lang="ts">
// 
import { ref, watch, toRaw } from 'vue';
import { useDocStore } from '../store/useDocStore';
import { useRunStore } from '../store/useRunStore';
import vscode from '../vscode';
import EndpointDetailViewer from './EndpointDetailViewer.vue';
import EndpointDetailEditor from './EndpointDetailEditor.vue';

const docStore = useDocStore();
const runStore = useRunStore();
const isEditing = ref(false);

watch(
    [() => docStore.selectedPath, () => docStore.selectedMethod],
    () => {
        if (isEditing.value) {
            docStore.endEditSession('endpoint');
            docStore.clearEditSnapshot();
        }
        isEditing.value = false;
        runStore.close();
    }
);

watch(
    () => docStore.doc,
    () => {
        if (!isEditing.value || !docStore.editSnapshot || !docStore.doc) {
            docStore.setEditSessionDirty(false);
            return;
        }
        const current = JSON.stringify(toRaw(docStore.doc));
        const baseline = JSON.stringify(docStore.editSnapshot.doc);
        docStore.setEditSessionDirty(current !== baseline);
    },
    { deep: true }
);

function onStartEdit() {
    docStore.takeEditSnapshot();
    docStore.startEditSession('endpoint');
    docStore.setEditSessionDirty(false);
    isEditing.value = true;
}

function onSave() {
    docStore.clearEditSnapshot();
    docStore.endEditSession('endpoint');
    vscode.postMessage({ type: 'save', doc: toRaw(docStore.doc) });
    isEditing.value = false;
}

function onCancel() {
    docStore.restoreFromEditSnapshot();
    docStore.endEditSession('endpoint');
    isEditing.value = false;
}
</script>

<style scoped>
.detail-pane {
    display: flex;
    flex-direction: column;
    height: 100%;
}
</style>

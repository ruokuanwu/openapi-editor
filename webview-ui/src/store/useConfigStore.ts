import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { EditorConfig } from '../types';

const DEFAULT_CONFIG: EditorConfig = {
    environments: [],
    auth: { type: 'none' },
    mock: { enabled: false, rules: [] },
    requestHistory: [],
    theme: 'light',
};

export const useConfigStore = defineStore('config', () => {
    const config = ref<EditorConfig>({ ...DEFAULT_CONFIG });

    function setConfig(c: EditorConfig) {
        config.value = { ...DEFAULT_CONFIG, ...c };
    }

    function updateEnvironments(envs: EditorConfig['environments']) {
        config.value.environments = envs;
    }

    function setActiveEnvironment(id: string | undefined) {
        config.value.activeEnvironment = id;
    }

    function updateAuth(auth: EditorConfig['auth']) {
        config.value.auth = auth;
    }

    function updateMock(mock: EditorConfig['mock']) {
        config.value.mock = mock;
    }

    return {
        config,
        setConfig,
        updateEnvironments,
        setActiveEnvironment,
        updateAuth,
        updateMock,
    };
});

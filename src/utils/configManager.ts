import * as vscode from 'vscode';
import type { EditorConfig, Environment, AuthConfig, MockConfig, ThemeMode } from '../../shared/types';

const SECTION = 'openapi-editor';

/** The subset of EditorConfig that lives in VS Code settings (excludes requestHistory). */
export type SettingsConfig = Omit<EditorConfig, 'requestHistory'>;

const DEFAULTS: SettingsConfig = {
    environments: [],
    auth: { type: 'none' },
    mock: { enabled: false, rules: [] },
    theme: 'light',
};

function getTarget(docUri: vscode.Uri): vscode.ConfigurationTarget {
    return vscode.workspace.getWorkspaceFolder(docUri)
        ? vscode.ConfigurationTarget.Workspace
        : vscode.ConfigurationTarget.Global;
}

export const configManager = {
    readConfig(docUri: vscode.Uri): SettingsConfig {
        const cfg = vscode.workspace.getConfiguration(SECTION, docUri);
        return {
            environments: cfg.get<Environment[]>('environments', DEFAULTS.environments),
            activeEnvironment: cfg.get<string | undefined>('activeEnvironment') ?? undefined,
            auth: cfg.get<AuthConfig>('auth', DEFAULTS.auth),
            mock: cfg.get<MockConfig>('mock', DEFAULTS.mock),
            theme: cfg.get<ThemeMode>('theme', DEFAULTS.theme as ThemeMode),
        };
    },

    async mergeConfig(docUri: vscode.Uri, partial: Partial<SettingsConfig>): Promise<void> {
        const cfg = vscode.workspace.getConfiguration(SECTION, docUri);
        const target = getTarget(docUri);
        for (const [key, value] of Object.entries(partial)) {
            if (value !== undefined) {
                await cfg.update(key, value, target);
            }
        }
    },
};

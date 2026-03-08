import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { EditorConfig } from '../shared/types';

const DEFAULT_CONFIG: EditorConfig = {
    environments: [],
    auth: { type: 'none' },
    mock: { enabled: false, rules: [] },
    requestHistory: [],
};

function getConfigPath(docUri: vscode.Uri): string {
    const dir = path.dirname(docUri.fsPath);
    return path.join(dir, '.openapi-editor');
}

export const configManager = {
    readConfig(docUri: vscode.Uri): EditorConfig {
        const configPath = getConfigPath(docUri);
        try {
            const content = fs.readFileSync(configPath, 'utf-8');
            return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
        } catch {
            return { ...DEFAULT_CONFIG };
        }
    },

    writeConfig(docUri: vscode.Uri, config: EditorConfig): void {
        const configPath = getConfigPath(docUri);
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    },

    mergeConfig(docUri: vscode.Uri, partial: Partial<EditorConfig>): void {
        const current = this.readConfig(docUri);
        const updated = { ...current, ...partial };
        this.writeConfig(docUri, updated);
    },
};

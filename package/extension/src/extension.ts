import * as vscode from 'vscode';
import { OpenApiEditorProvider } from './OpenApiEditorProvider';

export function activate(context: vscode.ExtensionContext) {
	// Register the custom text editor provider
	context.subscriptions.push(OpenApiEditorProvider.register(context));

	// Command: open a JSON file with the OpenAPI Editor
	context.subscriptions.push(
		vscode.commands.registerCommand('openapi-editor.openEditor', (uri?: vscode.Uri) => {
			const target = uri ?? vscode.window.activeTextEditor?.document.uri;
			if (!target) {
				vscode.window.showWarningMessage('请先打开一个 JSON 文件');
				return;
			}
			vscode.commands.executeCommand(
				'vscode.openWith',
				target,
				OpenApiEditorProvider.viewType
			);
		})
	);
}

export function deactivate() { }

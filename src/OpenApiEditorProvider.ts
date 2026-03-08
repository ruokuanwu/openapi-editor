import * as vscode from 'vscode';
import * as fs from 'fs';
import { configManager } from './utils/configManager';
import type { WebviewToExtMessage, OpenApiDoc } from './shared/types';

export class OpenApiEditorProvider implements vscode.CustomTextEditorProvider {
    public static readonly viewType = 'openapi-editor.editor';

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new OpenApiEditorProvider(context);
        return vscode.window.registerCustomEditorProvider(
            OpenApiEditorProvider.viewType,
            provider,
            {
                webviewOptions: { retainContextWhenHidden: true },
                supportsMultipleEditorsPerDocument: false,
            }
        );
    }

    constructor(private readonly context: vscode.ExtensionContext) { }

    async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        const webview = webviewPanel.webview;
        webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview'),
            ],
        };

        webview.html = this.getHtmlForWebview(webview);

        let ignoreNextDocChange = false;

        const sendDocToWebview = () => {
            let doc: OpenApiDoc;
            try {
                const text = document.getText();
                if (!text.trim()) {
                    doc = { openapi: '3.0.0', info: { title: 'New API', version: '1.0.0' }, paths: {}, tags: [] };
                } else {
                    doc = JSON.parse(text);
                }
            } catch {
                vscode.window.showErrorMessage('OpenAPI Editor: 无法解析 JSON 文件，请检查文件格式。');
                return;
            }
            const config = configManager.readConfig(document.uri);
            webview.postMessage({ type: 'init', doc, config });
        };

        // Handle messages from webview
        const msgDisposable = webview.onDidReceiveMessage((message: WebviewToExtMessage) => {
            switch (message.type) {
                case 'ready':
                    sendDocToWebview();
                    break;

                case 'save': {
                    ignoreNextDocChange = true;
                    const edit = new vscode.WorkspaceEdit();
                    const fullRange = new vscode.Range(
                        document.positionAt(0),
                        document.positionAt(document.getText().length)
                    );
                    edit.replace(document.uri, fullRange, JSON.stringify(message.doc, null, 2));
                    vscode.workspace.applyEdit(edit).then(() => {
                        vscode.window.setStatusBarMessage('$(check) OpenAPI 已保存', 3000);
                    });
                    break;
                }

                case 'updateConfig':
                    configManager.mergeConfig(document.uri, message.config);
                    break;
            }
        });

        // Sync external document changes back to webview
        const changeDocDisposable = vscode.workspace.onDidChangeTextDocument((e) => {
            if (e.document.uri.toString() !== document.uri.toString()) {
                return;
            }
            if (ignoreNextDocChange) {
                ignoreNextDocChange = false;
                return;
            }
            let doc: OpenApiDoc;
            try {
                doc = JSON.parse(document.getText());
            } catch {
                return;
            }
            webview.postMessage({ type: 'docChanged', doc });
        });

        webviewPanel.onDidDispose(() => {
            msgDisposable.dispose();
            changeDocDisposable.dispose();
        });
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const webviewDir = vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview');
        const indexPath = vscode.Uri.joinPath(webviewDir, 'index.html');

        try {
            let html = fs.readFileSync(indexPath.fsPath, 'utf-8');

            // Replace relative asset paths (./assets/xxx) with webview URIs
            html = html.replace(/\.\/(assets\/[^"']+)/g, (_, assetPath: string) => {
                return webview.asWebviewUri(vscode.Uri.joinPath(webviewDir, assetPath)).toString();
            });

            // Remove crossorigin attributes (not needed in webview context)
            html = html.replace(/ crossorigin/g, '');

            // Inject Content Security Policy
            const csp = [
                `default-src 'none'`,
                `style-src ${webview.cspSource} 'unsafe-inline'`,
                `script-src ${webview.cspSource}`,
                `font-src ${webview.cspSource} data:`,
                `img-src ${webview.cspSource} data: blob:`,
            ].join('; ');

            html = html.replace(
                '<meta charset="UTF-8" />',
                `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}">`
            );

            return html;
        } catch {
            return this.getFallbackHtml();
        }
    }

    private getFallbackHtml(): string {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>OpenAPI Editor</title>
  <style>
    body {
      font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
      color: var(--vscode-foreground, #ccc);
      background: var(--vscode-editor-background, #1e1e1e);
      display: flex; align-items: center; justify-content: center;
      height: 100vh; margin: 0; flex-direction: column; gap: 12px;
    }
    h2 { margin: 0; }
    code {
      background: var(--vscode-textCodeBlock-background, #333);
      padding: 4px 10px; border-radius: 4px; font-size: 13px;
    }
  </style>
</head>
<body>
  <h2>⚠️ OpenAPI Editor 未就绪</h2>
  <p>Webview 资源尚未构建，请在项目根目录运行：</p>
  <code>pnpm run build:webview</code>
</body>
</html>`;
    }
}

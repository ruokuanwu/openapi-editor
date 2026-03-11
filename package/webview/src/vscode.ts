// Acquire the VS Code API in the webview context.
// acquireVsCodeApi() can only be called once per session.
declare function acquireVsCodeApi(): {
    postMessage(message: unknown): void;
    getState(): unknown;
    setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

export default vscode;

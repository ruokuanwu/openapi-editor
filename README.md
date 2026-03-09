# OpenAPI Editor

> **可视化 OpenAPI 3.x 编辑器** — 专为 VS Code 打造，类似 Apifox/Postman 风格的接口管理界面。

[English](README.en.md) | 中文

---

## 功能特性

- **可视化接口管理**：以 Tag 分组展示全部接口，点击即可编辑请求方法、路径、参数、请求体、响应等。
- **组件库**：支持管理 Schemas、Responses、Parameters、Request Bodies 等可复用组件。
- **多环境支持**：配置多套环境（baseUrl + 自定义变量），一键切换，变量自动填入请求。
- **API 调试**：内置 HTTP 请求发送（在扩展 Host 进程中执行，绕过浏览器跨域限制）。
- **Mock 规则**：按路径/方法配置 Mock 响应，支持延迟模拟。
- **全局认证**：支持 Bearer Token、Basic Auth、API Key 等认证方式。
- **实时同步**：外部修改 JSON 文件后，编辑器自动刷新；保存操作直接回写文件。
- **浅色 / 深色主题**：可通过设置随时切换。
- **配置持久化**：所有设置存储在 VS Code `settings.json` 中，支持工作区级别覆盖。

---

## 安装

### 方式一：从 VSIX 文件安装（推荐用于本地开发）

```bash
# 先打包
make package
# 在 VS Code 中安装
code --install-extension openapi-editor-*.vsix
```

或在 VS Code 命令面板中执行 **"Extensions: Install from VSIX..."** 选择生成的 `.vsix` 文件。

### 方式二：从 VS Code Marketplace 安装

在扩展面板搜索 **"OpenAPI Editor"** 并点击安装（发布后可用）。

---

## 使用方法

### 打开编辑器

1. 在资源管理器中右键点击任意 `.json` 文件。
2. 选择 **"Open with OpenAPI Editor"**。
3. 或使用命令面板（`Ctrl+Shift+P`）输入 `OpenAPI Editor: Open with OpenAPI Editor`。

> **注意**：编辑器默认优先级为 `option`，即 `.json` 文件仍以文本编辑器打开，需手动选择 OpenAPI Editor。

### 基本操作

| 操作 | 方法 |
|------|------|
| 添加接口 | 左侧栏接口区顶部 `+` 按钮 |
| 添加 Tag | 左侧栏接口区顶部标签图标 |
| 删除接口 | 悬停在接口条目后点击 `×` |
| 编辑接口 | 点击接口条目，在右侧面板编辑 |
| 添加/删除组件 | 左侧栏组件区各类型旁的 `+` / `×` |
| 保存 | `Ctrl+S` / `Cmd+S`，或工具栏"保存"按钮 |
| 切换主题 | 右上角设置图标 → 外观 → 选择主题 |
| 切换环境 | 工具栏环境下拉框 |
| 发送请求 | 进入接口编辑页 → "调试"标签 → 填写参数 → 发送 |

---

## 配置说明

所有配置存储在 VS Code `settings.json` 中（工作区级别：`.vscode/settings.json`；无工作区时写入用户全局设置）。你也可以在 **Settings UI**（`Ctrl+,`）中搜索 `openapi-editor` 进行可视化编辑。

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `openapi-editor.environments` | `array` | `[]` | 环境列表，每项包含 `id`/`name`/`baseUrl`/`variables` |
| `openapi-editor.activeEnvironment` | `string` | `null` | 当前激活环境的 ID |
| `openapi-editor.auth` | `object` | `{"type":"none"}` | 全局认证配置，支持 `none` / `bearer` / `basic` / `apikey` |
| `openapi-editor.mock` | `object` | `{"enabled":false,"rules":[]}` | Mock 配置，包含 `enabled`/`delay`/`rules` |
| `openapi-editor.theme` | `"light"` \| `"dark"` | `"light"` | 编辑器主题 |

> **请求历史**（`requestHistory`）不存入 `settings.json`，而是保存在 VS Code 工作区级别的持久状态中（`ExtensionContext.workspaceState`），以避免大量历史记录污染配置文件。

### 示例 `.vscode/settings.json`

```json
{
  "openapi-editor.theme": "dark",
  "openapi-editor.environments": [
    {
      "id": "env-local",
      "name": "本地",
      "baseUrl": "http://localhost:8080",
      "variables": [
        { "key": "token", "value": "my-dev-token" }
      ]
    },
    {
      "id": "env-prod",
      "name": "生产",
      "baseUrl": "https://api.example.com",
      "variables": []
    }
  ],
  "openapi-editor.activeEnvironment": "env-local",
  "openapi-editor.auth": {
    "type": "bearer",
    "bearer": { "token": "{{token}}" }
  }
}
```

---

## 开发指南

### 前置要求

| 工具 | 版本要求 |
|------|---------|
| Node.js | ≥ 20 |
| pnpm | ≥ 9 |
| VS Code | ≥ 1.109 |
| make | 任意版本（可选，用于 Makefile） |

### 快速开始

```bash
# 克隆仓库
git clone https://github.com/your-org/openapi-editor.git
cd openapi-editor

# 安装依赖
make install
# 或手动：
pnpm install && cd webview-ui && pnpm install

# 完整构建
make build
```

### 调试

1. 在 VS Code 中打开项目根目录。
2. 按 `F5` 启动 **Extension Development Host**（新窗口）。
3. 在新窗口中打开任意 `.json` 文件，右键选择 **"Open with OpenAPI Editor"**。

如果修改了 WebView（`webview-ui/`），需先运行 `make build-webview`，然后在 Extension Development Host 窗口中使用 `>Developer: Reload Webview` 命令刷新。

如果只修改了扩展 Host 代码（`src/`），使用 `make compile` 后重新加载窗口（`>Developer: Reload Window`）即可。

### Makefile 常用命令

```bash
make help          # 打印所有可用命令
make install       # 安装所有依赖
make build         # 完整构建（webview + extension）
make build-webview # 仅构建 WebView
make compile       # 仅编译 Extension TypeScript
make watch         # 监听 Extension TypeScript 变更
make lint          # 运行 ESLint
make package       # 打包为 .vsix 文件
make publish       # 发布到 VS Code Marketplace（需设置 VSCE_PAT）
make clean         # 删除构建产物（out/）
make rebuild       # clean + build
make clean-all     # 删除构建产物及所有 node_modules
```

---

## 项目结构

```
openapi-editor/
├── src/                        # Extension Host（Node.js 环境）
│   ├── extension.ts            # 入口：注册 provider 和命令
│   ├── OpenApiEditorProvider.ts # CustomTextEditorProvider 实现
│   ├── shared/
│   │   └── types.ts            # 共享类型（OpenAPI 数据结构 + 消息协议）
│   └── utils/
│       └── configManager.ts    # 读写 VS Code settings（Configuration API）
├── webview-ui/                 # WebView 前端（Vite + Vue 3 + Pinia + Element Plus）
│   ├── src/
│   │   ├── App.vue             # 根组件，处理 Extension Host ↔ WebView 消息
│   │   ├── types.ts            # 前端类型定义（与 shared/types.ts 镜像）
│   │   ├── vscode.ts           # acquireVsCodeApi() 封装
│   │   ├── components/         # UI 组件
│   │   │   ├── Sidebar.vue         # 接口/组件列表侧边栏
│   │   │   ├── EndpointEditor.vue  # 接口编辑主面板
│   │   │   ├── SchemaEditor.vue    # 递归 Schema 编辑器
│   │   │   ├── SettingsPanel.vue   # 设置抽屉（主题/环境/认证/Mock）
│   │   │   ├── RunInstancePanel.vue # 接口调试面板
│   │   │   └── ...
│   │   ├── store/
│   │   │   ├── useDocStore.ts      # OpenAPI 文档状态管理
│   │   │   ├── useConfigStore.ts   # 编辑器配置状态管理
│   │   │   └── useRunStore.ts      # 请求调试状态管理
│   │   └── utils/
│   │       ├── requestBuilder.ts   # 构建 HTTP 请求
│   │       ├── mockGenerator.ts    # Mock 数据生成
│   │       └── exportUtils.ts      # 导出工具
│   └── vite.config.ts
├── Makefile                    # 常用操作快捷命令
├── package.json                # 扩展 manifest
├── tsconfig.json               # TypeScript 配置
└── README.md                   # 本文档（中文）
```

---

## 消息通信协议

Extension Host 与 WebView 通过 `postMessage` 通信：

| 方向 | 消息类型 | 说明 |
|------|---------|------|
| Host → WebView | `init` | 首次初始化（文档 + 配置） |
| Host → WebView | `docChanged` | 文档被外部修改时推送最新内容 |
| Host → WebView | `configUpdated` | VS Code 设置变更时推送最新配置 |
| Host → WebView | `runResponse` | HTTP 请求响应结果 |
| Host → WebView | `runError` | HTTP 请求失败错误信息 |
| WebView → Host | `ready` | WebView 加载完成，触发 `init` |
| WebView → Host | `save` | 保存文档 |
| WebView → Host | `updateConfig` | 更新配置（theme/auth/environments/mock/requestHistory）|
| WebView → Host | `runRequest` | 发起 HTTP 请求 |

---

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库。
2. 创建功能分支：`git checkout -b feat/your-feature`。
3. 提交前确保：`make lint` 通过，`make build` 无报错。
4. 提交 Pull Request，请附上改动说明。

---

## License

MIT


Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**

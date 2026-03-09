# OpenAPI Editor

> **Visual OpenAPI 3.x Editor** — A VS Code extension providing an Apifox/Postman-style interface for managing and debugging API definitions.

[中文](README.md) | English

---

## Features

- **Visual API management**: Browse all endpoints grouped by tag; click to edit method, path, parameters, request body, and responses.
- **Component library**: Manage reusable Schemas, Responses, Parameters, and Request Bodies.
- **Multi-environment support**: Define multiple environments (baseUrl + custom variables) and switch between them with a single click.
- **API debugging**: Built-in HTTP request sender that executes in the Extension Host process, bypassing browser CORS restrictions.
- **Mock rules**: Configure mock responses per path/method with configurable delay simulation.
- **Global authentication**: Supports Bearer Token, Basic Auth, and API Key authentication.
- **Real-time sync**: Automatically reloads when the JSON file is modified externally; saves write back to the file directly.
- **Light / Dark theme**: Switch themes at any time through the settings panel.
- **Persistent configuration**: All settings are stored in VS Code `settings.json`, supporting workspace-level overrides.

---

## Installation

### Option 1: Install from a VSIX file (recommended for local development)

```bash
# Package the extension
make package
# Install into VS Code
code --install-extension openapi-editor-*.vsix
```

Or use the VS Code Command Palette: **"Extensions: Install from VSIX..."** and select the generated `.vsix` file.

### Option 2: Install from VS Code Marketplace

Search for **"OpenAPI Editor"** in the Extensions panel and click Install (available after publishing).

---

## Usage

### Opening the editor

1. Right-click any `.json` file in the Explorer.
2. Select **"Open with OpenAPI Editor"**.
3. Or open the Command Palette (`Ctrl+Shift+P`) and run `OpenAPI Editor: Open with OpenAPI Editor`.

> **Note**: The editor's priority is set to `option`, so `.json` files still open in the default text editor. You must explicitly choose the OpenAPI Editor.

### Basic operations

| Action | How |
|--------|-----|
| Add endpoint | `+` button at the top of the Endpoints section |
| Add tag | Tag icon at the top of the Endpoints section |
| Delete endpoint | Hover over the item, click `×` |
| Edit endpoint | Click the item; edit in the right panel |
| Add/remove component | `+` / `×` next to the component group |
| Save | `Ctrl+S` / `Cmd+S`, or the toolbar Save button |
| Switch theme | Settings icon (top-right) → Appearance → Theme |
| Switch environment | Environment dropdown in the toolbar |
| Send request | Open endpoint → "Debug" tab → fill params → Send |

---

## Configuration

All settings are stored in VS Code `settings.json`. At the workspace level they go into `.vscode/settings.json`; without an open workspace they are written to the user global settings. You can also edit them via the **Settings UI** (`Ctrl+,`) by searching for `openapi-editor`.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `openapi-editor.environments` | `array` | `[]` | List of environments; each item has `id`, `name`, `baseUrl`, `variables` |
| `openapi-editor.activeEnvironment` | `string` | `null` | ID of the currently active environment |
| `openapi-editor.auth` | `object` | `{"type":"none"}` | Global auth config – supports `none` / `bearer` / `basic` / `apikey` |
| `openapi-editor.mock` | `object` | `{"enabled":false,"rules":[]}` | Mock config with `enabled`, `delay`, `rules` |
| `openapi-editor.theme` | `"light"` \| `"dark"` | `"light"` | Editor color theme |

> **Request history** (`requestHistory`) is intentionally excluded from `settings.json`. It is stored in VS Code's `ExtensionContext.workspaceState` to avoid polluting the configuration file with large history data.

### Example `.vscode/settings.json`

```json
{
  "openapi-editor.theme": "dark",
  "openapi-editor.environments": [
    {
      "id": "env-local",
      "name": "Local",
      "baseUrl": "http://localhost:8080",
      "variables": [
        { "key": "token", "value": "my-dev-token" }
      ]
    },
    {
      "id": "env-prod",
      "name": "Production",
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

## Development Guide

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20 |
| pnpm | ≥ 9 |
| VS Code | ≥ 1.109 |
| make | any (optional, for Makefile targets) |

### Getting started

```bash
# Clone the repo
git clone https://github.com/your-org/openapi-editor.git
cd openapi-editor

# Install dependencies
make install
# or manually:
pnpm install && cd webview-ui && pnpm install

# Full build
make build
```

### Debugging

1. Open the project root folder in VS Code.
2. Press `F5` to launch the **Extension Development Host** (a new window).
3. In the new window, open any `.json` file and right-click → **"Open with OpenAPI Editor"**.

After modifying the WebView (`webview-ui/`), run `make build-webview`, then use `>Developer: Reload Webview` in the Extension Development Host window.

After modifying extension Host code (`src/`), run `make compile` and reload the window (`>Developer: Reload Window`).

### Makefile targets

```bash
make help          # Show all available targets
make install       # Install all dependencies
make build         # Full build (webview + extension)
make build-webview # Build webview only
make compile       # Compile extension TypeScript only
make watch         # Start TypeScript watch mode
make lint          # Run ESLint
make package       # Package into a .vsix file
make publish       # Publish to VS Code Marketplace (requires VSCE_PAT)
make clean         # Delete build outputs (out/)
make rebuild       # clean + build
make clean-all     # Delete build outputs and all node_modules
```

---

## Project Structure

```
openapi-editor/
├── src/                        # Extension Host (Node.js environment)
│   ├── extension.ts            # Entry point: register provider and commands
│   ├── OpenApiEditorProvider.ts # CustomTextEditorProvider implementation
│   ├── shared/
│   │   └── types.ts            # Shared types (OpenAPI data structures + message protocol)
│   └── utils/
│       └── configManager.ts    # Read/write VS Code settings (Configuration API)
├── webview-ui/                 # WebView frontend (Vite + Vue 3 + Pinia + Element Plus)
│   ├── src/
│   │   ├── App.vue             # Root component; handles Extension Host ↔ WebView messages
│   │   ├── types.ts            # Frontend type definitions (mirrors shared/types.ts)
│   │   ├── vscode.ts           # acquireVsCodeApi() wrapper
│   │   ├── components/         # UI components
│   │   │   ├── Sidebar.vue         # Endpoint/component list sidebar
│   │   │   ├── EndpointEditor.vue  # Endpoint editor main panel
│   │   │   ├── SchemaEditor.vue    # Recursive schema editor
│   │   │   ├── SettingsPanel.vue   # Settings drawer (theme/env/auth/mock)
│   │   │   ├── RunInstancePanel.vue # API debug panel
│   │   │   └── ...
│   │   ├── store/
│   │   │   ├── useDocStore.ts      # OpenAPI document state
│   │   │   ├── useConfigStore.ts   # Editor config state
│   │   │   └── useRunStore.ts      # Request debug state
│   │   └── utils/
│   │       ├── requestBuilder.ts   # HTTP request construction
│   │       ├── mockGenerator.ts    # Mock data generation
│   │       └── exportUtils.ts      # Export utilities
│   └── vite.config.ts
├── Makefile                    # Shortcut commands for common operations
├── package.json                # Extension manifest
├── tsconfig.json               # TypeScript config
└── README.en.md                # This file
```

---

## Message Protocol

The Extension Host and WebView communicate via `postMessage`:

| Direction | Message type | Description |
|-----------|-------------|-------------|
| Host → WebView | `init` | Initial load (document + config) |
| Host → WebView | `docChanged` | Document modified externally |
| Host → WebView | `configUpdated` | VS Code settings changed |
| Host → WebView | `runResponse` | HTTP response result |
| Host → WebView | `runError` | HTTP request failure |
| WebView → Host | `ready` | WebView loaded; triggers `init` |
| WebView → Host | `save` | Save document |
| WebView → Host | `updateConfig` | Update config (theme/auth/environments/mock/requestHistory) |
| WebView → Host | `runRequest` | Fire an HTTP request |

---

## Contributing

Issues and Pull Requests are welcome!

1. Fork this repository.
2. Create a feature branch: `git checkout -b feat/your-feature`.
3. Before submitting: ensure `make lint` passes and `make build` succeeds.
4. Open a Pull Request with a clear description of your changes.

---

## License

MIT

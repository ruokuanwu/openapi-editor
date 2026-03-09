# ─────────────────────────────────────────────────────────────────────────────
# OpenAPI Editor – Makefile
# Usage: make <target>
# ─────────────────────────────────────────────────────────────────────────────

.DEFAULT_GOAL := help

PNPM        := pnpm
VSCE        := npx @vscode/vsce
OUT_DIR     := out
VSIX_GLOB   := *.vsix

# ── Help ─────────────────────────────────────────────────────────────────────

.PHONY: help
help: ## Show this help message
	@echo ""
	@echo "  OpenAPI Editor – available targets"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ── Dependencies ─────────────────────────────────────────────────────────────

.PHONY: install
install: ## Install all dependencies (extension + webview-ui)
	$(PNPM) install
	cd webview-ui && $(PNPM) install

# ── Build ─────────────────────────────────────────────────────────────────────

.PHONY: build
build: build-webview compile ## Full build: webview + extension TypeScript

.PHONY: build-webview
build-webview: ## Build the Vue webview (outputs to out/webview/)
	$(PNPM) run build:webview

.PHONY: compile
compile: ## Compile extension TypeScript only (outputs to out/)
	$(PNPM) run compile

.PHONY: watch
watch: ## Start TypeScript watch mode for the extension
	$(PNPM) run watch

.PHONY: rebuild
rebuild: clean build ## Clean then full build

# ── Quality ──────────────────────────────────────────────────────────────────

.PHONY: lint
lint: ## Run ESLint on extension source
	$(PNPM) run lint

.PHONY: test
test: ## Compile then run extension tests
	$(PNPM) run pretest && $(PNPM) run test

# ── Packaging ────────────────────────────────────────────────────────────────

.PHONY: package
package: rebuild ## Package the extension into a .vsix file (requires vsce)
	$(VSCE) package --no-dependencies
	@echo ""
	@echo "  ✓ VSIX created:"
	@ls -lh $(VSIX_GLOB) 2>/dev/null || echo "  (no .vsix found – check vsce output above)"

.PHONY: publish
publish: package ## Publish to VS Code Marketplace (requires VSCE_PAT env var)
	@test -n "$$VSCE_PAT" || (echo "Error: VSCE_PAT is not set" && exit 1)
	$(VSCE) publish --no-dependencies

# ── Cleanup ──────────────────────────────────────────────────────────────────

.PHONY: clean
clean: ## Remove build outputs (out/)
	rm -rf $(OUT_DIR)
	@echo "  Removed $(OUT_DIR)/"

.PHONY: clean-all
clean-all: clean ## Remove build outputs and all node_modules
	rm -rf node_modules webview-ui/node_modules
	@echo "  Removed node_modules/"

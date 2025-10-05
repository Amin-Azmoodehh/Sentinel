## [2.3.11] - 2025-10-05

### Fixed

- **Critical**: `sentinel_shell` timeout issue resolved
  - Added real timeout guard with process kill after timeout expires
  - Fixed Windows shell execution (PowerShell/CMD) with proper args and `shell: false`
  - Shell commands (e.g., `python --version`, `echo test`) now execute immediately
- **Task API**: `createSubtask` and `listSubtasks` now accept both `payload.taskId` and `payload.parent` (compatibility fix)

---

## [2.3.10] - 2025-10-05

### Added

- Built-in multi-language formatting and linting commands:
  - `st fmt [lang]` and `st lint [lang]` (JS/TS, Python, Go, Rust, Shell, MD/YAML/JSON)
  - `st init-config [lang]` to generate minimal configs
- Python helpers (Ruff):
  - `st py init-config`, `st py format`, `st py lint`

### Fixed

- Reliable workspace handling for MCP (`--workspace` in args, absolute `SENTINEL_WORKSPACE`)
- Safer FS path checks using `path.relative` (Windows-safe)

### Changed

- `st ide set` now generates ready-to-run `mcp.json` with absolute workspace path
- Docs updated: README and MCP_SETUP include built-in fmt/lint usage

---

# Changelog

All notable changes to SentinelTM will be documented in this file.

## [2.3.6] - 2025-10-05

### 🎉 Critical Bug Fix

- **Fixed MCP workspace `cwd` bug**: The server now correctly initializes the workspace directory before any operations begin. Previously, `SENTINEL_WORKSPACE` was applied too late, causing file operations to execute in the wrong directory (IDE installation folder).
  - Moved workspace initialization logic to a dedicated `async initialize()` method
  - This method is now called at the beginning of `start()`, ensuring proper `cwd` and `fsService` configuration
  - Impact: File operations now work correctly in your project directory from the first command!

### Changed

- Refactored `SentinelMcpServer` class for better maintainability
- Improved error logging for workspace configuration issues

### Documentation

- Completely rewrote `MCP_SETUP.md` with clearer instructions
- Updated IDE configuration examples for Windsurf, Cursor, and Claude Desktop
- Added troubleshooting section
- Simplified configuration files (removed redundant provider settings from `mcp.json`)

---

## [2.3.5] - 2025-10-05

### Fixed

- Updated `.windsurf/mcp.json` and `.cursor/mcp.json` to use `st` command directly
- Removed hardcoded paths for better portability
- Added test sandbox for verifying file operations

### Added

- Created `mcp_test_sandbox/` with test scripts for validation

---

## [1.2.1] - 2025-01-10

### Fixed

- 🐛 **Critical**: Fixed workspace path resolution - files now created in correct location
- 🐛 Fixed MCP config validation errors (removed invalid properties)
- 🐛 Fixed file splitting algorithm with brace depth tracking
- 🐛 Added missing `searchIndex` function to indexService

### Added

- ✨ Added `SENTINEL_WORKSPACE` environment variable support
- ✨ Added timeout protection (30s for gates, 15s for subtasks)
- ✨ Added comprehensive MCP tools guide
- ✨ Added system prompts for all IDEs
- ✨ Added test report documentation

### Changed

- ⚡ Increased `maxIndexLines` to 10000 to prevent file splitting
- 📝 Updated all IDE configs (.windsurf, .cursor, .zed, .trae, .gemini)
- 📝 Updated rules for all IDEs
- 📝 Improved error messages for better debugging

### Performance

- ⚡ Optimized file operations with proper workspace resolution
- ⚡ Reduced timeout-related hangs

## [1.2.0] - Previous Release

### Added

- Initial MCP server implementation
- Task management system
- File operations
- Shell execution
- Code indexing
- Quality gates

---

**Score Improvement:**

- v1.2.0: 6.0/10
- v1.2.1: 7.5/10 (+1.5)

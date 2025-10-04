# Changelog

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

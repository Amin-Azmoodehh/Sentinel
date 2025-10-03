# Changelog - Enhanced Features

## [Enhanced] - 2024

### Added

#### 🔒 Path Security System
- Whitelist/blacklist management for file paths
- Automatic system path detection and blocking
- Path validation before operations
- CLI commands: `st security whitelist/blacklist/validate`
- MCP tool: `sentinel_security`

#### 📊 Advanced Indexing
- External project indexing support
- Customizable file filters (include/exclude patterns)
- File size limits for indexing
- Symbolic link following option
- Performance optimizations for large projects
- CLI commands: `st index advanced`, `st index search-advanced`, `st index clear-cache`
- Enhanced MCP tool: `sentinel_index` with `advanced` and `searchAdvanced` actions

#### 🖥️ Enhanced Shell Service
- Preset commands for common operations (git, npm, system)
- Adaptive command translation (Windows ↔ Linux)
- Command pipeline execution with variable passing
- Platform-specific command detection
- Extended PowerShell support

#### 📈 Project Dashboard
- Real-time project metrics (files, tasks, quality, system)
- Command history tracking
- Report generation (Markdown format)
- JSON export for automation
- CLI commands: `st dashboard show`, `st dashboard report`
- MCP tool: `sentinel_dashboard`

#### 🔄 CI/CD Integration
- GitHub Actions workflow generator
- GitLab CI configuration generator
- Local pipeline execution
- Quality gate integration
- Pipeline history tracking
- CLI commands: `st cicd init`, `st cicd run`, `st cicd gate`, `st cicd history`
- MCP tool: `sentinel_cicd`

### Enhanced

#### File Operations
- Path security validation integrated
- Better error messages for path violations
- Workspace boundary enforcement

#### Shell Operations
- Adaptive syntax for cross-platform compatibility
- Preset command library
- Pipeline support with output chaining

#### Index Operations
- Advanced filtering options
- External project support
- Better performance for large codebases
- Cache management

### Configuration

New configuration options in `.sentineltm/config/config.json`:

```json
{
  "security": {
    "pathWhitelist": [],
    "pathBlacklist": []
  },
  "index": {
    "externalProjects": [],
    "exclude": [],
    "maxFileSize": 1048576
  },
  "shell": {
    "presets": [],
    "adaptiveMode": true
  },
  "dashboard": {
    "refreshInterval": 5000
  },
  "cicd": {
    "defaultProvider": "github"
  }
}
```

### MCP Tools

New MCP tools available:
- `sentinel_security` - Path security management
- `sentinel_dashboard` - Project monitoring
- `sentinel_cicd` - CI/CD integration

Enhanced MCP tools:
- `sentinel_index` - Now supports advanced indexing and filtering
- `sentinel_shell` - Adaptive command execution

### Documentation

- Added `ENHANCED_FEATURES.md` with comprehensive Persian documentation
- Updated README.md with new features
- Added usage examples and best practices
- Troubleshooting guide for new features

### Performance

- Optimized indexing for large projects
- Reduced memory usage in dashboard metrics
- Faster path validation with caching
- Improved shell command execution

### Security

- System path protection by default
- Whitelist/blacklist enforcement
- Path traversal prevention
- Better validation before operations

---

**Total New Features:** 5 major systems
**New CLI Commands:** 15+
**New MCP Tools:** 3
**Enhanced MCP Tools:** 2

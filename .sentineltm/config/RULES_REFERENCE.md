# SentinelTM Rules Reference

## 📋 Project Quality Rules

### Entry Point Rules
- **Filename:** `main.py` (or configured alternative)
- **Max Lines:** 4
- **Content:** Import-only, no side effects
- **Purpose:** Minimal entry point that delegates to core modules

### Style Rules
- **Max Line Length:** 79 characters (PEP8)
- **No Side Effects on Import:** Modules must be importable without execution
- **Absolute Imports Only:** No relative imports, no wildcards
- **Type Hints:** Required for all function signatures

### Forbidden Patterns
**Functions:**
- `print(` - Use logging module instead
- `eval(` - Security risk
- `exec(` - Security risk
- `compile(` - Security risk

**Modules:**
- `subprocess` - Use controlled shell service
- `os.system` - Use controlled shell service
- `__import__` - Use standard imports

### Externalization Rules
- **Texts Path:** `data/texts/*.json`
- **Config Path:** `data/config/*.json`
- **No Hardcoded Strings:** All user-facing text must be in JSON files
- **Logging Keys:** Reference keys from `data/texts/en.json`
- **Chat Messages:** Reference keys from `data/texts/fa.json`

### Logging Rules
- **Console Language:** English (`en`)
- **Chat Language:** Persian (`fa`)
- **Only Logging Allowed:** No `print()` statements
- **Log Levels:** Use appropriate levels (info, warn, error, debug)

## 🔒 Security Rules

### Shell Commands
**Allowed:**
```json
["ls", "dir", "cat", "type", "echo", "npm", "git", "node", "python", "st"]
```

**Blocked:**
```json
["rm", "del", "mv", "cp", "chmod", "sudo", "kill", "shutdown"]
```

### File Operations
- **Workspace-Relative Paths Only:** No absolute paths
- **Allowed Roots:** `src/`, `data/`, `.sentineltm/`, `project/`
- **Max File Size:** 5MB (configurable)
- **Auto-Split:** Files > 300 lines split automatically

### Code Patterns
**Forbidden in Production:**
- `console.log(` - Use logger
- `eval(` - Security risk
- `exec(` - Security risk
- `dangerouslySetInnerHTML` - XSS risk

## 🎯 Quality Thresholds

### Gate Scores
- **Minimum:** 95/100
- **Retries:** 5 attempts
- **Fallback:** Allowed if all attempts fail

### File Limits
- **Max Size:** 5MB
- **Max Lines:** 300 (before auto-split)
- **Max TODO Count:** 10

### Index Limits
- **Max Lines per File:** 300
- **Auto-Split:** Enabled
- **Skip Patterns:** `_parts`, `.part`

## 📁 Project Structure Rules

### Required Directories
```
project/
├── app/
│   ├── core/       # Core business logic
│   ├── utils/      # Utility functions
│   ├── filters/    # Data filters
│   └── class/      # Class definitions
├── data/
│   ├── config/     # Configuration files
│   └── texts/      # Localized text files
└── main.py         # Entry point (< 4 lines)
```

### File Naming
- **Entry Point:** `main.py` or `launcher.py`
- **Modules:** `snake_case.py`
- **Classes:** `PascalCase` in files
- **Functions:** `snake_case`
- **Constants:** `UPPER_SNAKE_CASE`

## 🔧 Development Rules

### TypeScript/JavaScript
```typescript
// ✅ GOOD
interface Config {
  provider: string;
  model: string;
}

async function loadConfig(): Promise<Config> {
  // Implementation
}

// ❌ BAD
function loadConfig(): any {  // No 'any'
  // Implementation
}
```

### Python
```python
# ✅ GOOD
from app.core import config_loader
from typing import Dict, List

def load_config() -> Dict[str, str]:
    return config_loader.load()

# ❌ BAD
from app.core import *  # No wildcards
def load_config():      # No type hints
    return config_loader.load()
```

## 🧪 Testing Rules

### Coverage Requirements
- **Minimum:** 80% overall
- **Critical Paths:** 100%
- **New Code:** 90%

### Test Structure
```typescript
describe('Feature', () => {
  it('should handle success case', () => {
    // Test
  });
  
  it('should handle error case', () => {
    // Test
  });
});
```

## 📊 Performance Rules

### Response Times
- **MCP Simple Operations:** < 1s
- **File Operations:** < 500ms
- **Index Operations:** < 5s
- **Gate Execution:** < 30s

### Resource Limits
- **Memory:** < 100MB for CLI
- **CPU:** < 50% sustained
- **Disk I/O:** Batched when possible

## 🌐 Localization Rules

### Text Files
**English (`data/texts/en.json`):**
```json
{
  "app.start": "Application started",
  "app.stop": "Application stopped",
  "error.file_not_found": "File not found: {path}"
}
```

**Persian (`data/texts/fa.json`):**
```json
{
  "chat.welcome": "خوش آمدید",
  "chat.goodbye": "خداحافظ",
  "chat.error": "خطا: {message}"
}
```

### Usage
```python
# Logging (English)
logger.info(texts['en']['app.start'])

# Chat (Persian)
chat_message = texts['fa']['chat.welcome']
```

## 🔄 MCP Integration Rules

### Tool Naming
- **Correct:** `mcp0_sentinel_task` with actions
- **Wrong:** `mcp0_task_update` (doesn't exist)

### Path Handling
```javascript
// ✅ GOOD
mcp0_file_read({ path: 'project/src/file.ts' })

// ❌ BAD
mcp0_file_read({ path: 'd:\\project\\file.ts' })
```

### Index Scoping
```javascript
// ✅ GOOD
mcp0_index_build({ root: 'project' })

// ❌ BAD
mcp0_index_build()  // Missing root
```

## 📝 Documentation Rules

### Code Comments
- **JSDoc/Docstrings:** Required for public APIs
- **Inline Comments:** For complex logic only
- **TODO Comments:** Max 10 per project

### README Sections
1. Installation
2. Quick Start
3. Configuration
4. API Reference
5. Troubleshooting
6. Contributing

## 🚀 Release Rules

### Version Numbering
- **Major:** Breaking changes
- **Minor:** New features
- **Patch:** Bug fixes

### Pre-Release Checklist
- [ ] All tests pass
- [ ] Gate score ≥ 95
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] Version bumped
- [ ] Git tagged

---

**These rules are enforced by `.sentineltm/config/rules.json` and quality gates.**

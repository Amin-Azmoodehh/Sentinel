# 🚀 SentinelTM Quick Start Guide

## Installation

```bash
# Clone and install
git clone https://github.com/Amin-Azmoodehh/Sentinel.git
cd Sentinel
npm install
npm run build

# Link globally (optional)
npm link
```

## Basic Setup

```bash
# Detect AI providers
st provider detect

# Set your provider
st set provider gemini

# Start MCP server
st serve
```

## Essential Commands

### 📁 Files
```bash
st fs ls "src/**/*.ts"
st fs mkdir "app/models"
st fs cp src/old.ts src/new.ts
```

### 📋 Tasks
```bash
st task create --title "Fix bug" --priority high
st task list --status open
st task next
```

### 🔍 Index
```bash
st index run
st index search "MyClass"
st index symbols --name Task
```

### 🖥️ Shell
```bash
st shell run "npm test"
st shell run "git status"
```

### ✅ Quality
```bash
st gate run --min 95
```

### 🔒 Security
```bash
st security whitelist --add "src/**"
st security blacklist --add "node_modules"
st security validate "path/to/file"
```

### 📊 Dashboard
```bash
st dashboard show
st dashboard report --output report.md
```

### 🔄 CI/CD
```bash
st cicd init --provider github
st cicd run --config cicd.json
st cicd gate
```

## MCP Integration

### Configure IDE

Add to your IDE's MCP config:

```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "node",
      "args": ["path/to/Sentinel/dist/cli.js", "serve"]
    }
  }
}
```

### Use MCP Tools

```javascript
// File operations
mcp0_file_read({ path: "src/app.ts" })
mcp0_file_write({ path: "src/new.ts", content: "..." })

// Task management
mcp0_task_create({ title: "Fix bug", priority: "high" })
mcp0_task_list({ status: "open" })

// Indexing (IMPORTANT: specify root)
mcp0_index_build({ root: "src" })
mcp0_index_query({ kind: "search", query: "MyClass" })

// Security
mcp0_sentinel_security({ action: "validatePath", payload: { path: "src/app.ts" }})

// Dashboard
mcp0_sentinel_dashboard({ action: "getMetrics" })

// CI/CD
mcp0_sentinel_cicd({ action: "runQualityGate" })
```

## Common Workflows

### 1. New Project Setup
```bash
st security whitelist --add "src/**"
st security whitelist --add "tests/**"
st index advanced --root "src" --exclude "*.test.ts"
st cicd init --provider github
st dashboard show
```

### 2. Quality Check Before Commit
```bash
st cicd gate
st dashboard report
git commit -m "feat: new feature"
```

### 3. Code Search
```bash
st index run
st index search "MyFunction"
st index symbols --name Task
```

### 4. Task Management
```bash
st task create --title "Implement feature" --priority high
st task list --status open
st task next
st task update 1 --status done
```

## Configuration

Edit `.sentineltm/config/config.json`:

```json
{
  "defaults": {
    "provider": "gemini",
    "model": "gemini-1.5-pro"
  },
  "thresholds": {
    "gate": 95,
    "maxFileSizeMB": 5
  },
  "security": {
    "pathWhitelist": ["src/**"],
    "pathBlacklist": ["node_modules/**"]
  }
}
```

## Troubleshooting

**Provider not found:**
```bash
st provider detect
```

**Path errors:**
Use relative paths: `src/app.ts` not `d:\project\src\app.ts`

**Index EBUSY:**
Always specify root: `mcp0_index_build({ root: "src" })`

**Gate failing:**
```bash
st gate run --min 95
```

## Next Steps

1. Read [MCP_TOOLS_GUIDE.md](./MCP_TOOLS_GUIDE.md) for all tools
2. Check [ENHANCED_FEATURES.md](./ENHANCED_FEATURES.md) for new features
3. See [README.md](./README.md) for complete documentation

---

**Need Help?** Check the [troubleshooting section](./README.md#troubleshooting) in README.md

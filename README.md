# 🤖 SentinelTM

SentinelTM (`st`) is a local-first AI agent orchestrator that combines a powerful CLI with an MCP server. It provides secure file operations, shell execution, code indexing, task management, and quality gates - all controlled by AI providers without requiring remote services.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/Amin-Azmoodehh/Sentinel)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://github.com/Amin-Azmoodehh/Sentinel)
[![License](https://img.shields.io/badge/license-ISC-green)](https://github.com/Amin-Azmoodehh/Sentinel)
[![GitHub](https://img.shields.io/badge/GitHub-Amin--Azmoodehh%2FSentinel-blue)](https://github.com/Amin-Azmoodehh/Sentinel)

## 🎯 Core Concept

**AI Provider Commands → SentinelTM Executes**

Your AI model (Gemini, Claude, Qwen, Ollama) connects via MCP and controls SentinelTM's tools to:
- 📁 Read/write files securely with whitelist/blacklist
- 🖥️ Execute shell commands safely with adaptive syntax
- 🔍 Index and search codebases with advanced filters
- 📋 Manage tasks and workflows
- ✅ Run quality checks and CI/CD pipelines
- 📊 Monitor project health with dashboard
- 🔒 Validate paths and prevent system access

## 🚀 Quick Setup

### Installation

```bash
# NPM
npm install -g sentineltm-cli

# Yarn
yarn global add sentineltm-cli

# PNPM
pnpm add -g sentineltm-cli

# Bun
bun add -g sentineltm-cli

# Or use without installation
npx sentineltm-cli --help
bunx sentineltm-cli --help
pnpx sentineltm-cli --help
```

### Basic Usage

```bash
# Detect available AI providers
st provider detect

# Set your preferred AI provider
st set provider gemini

# Start MCP server for AI agents
st serve
```

### MCP Configuration

Add to your IDE's MCP config file:

**Using npx (recommended):**
```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "npx",
      "args": ["-y", "sentineltm-cli", "serve"]
    }
  }
}
```

**Using bunx:**
```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "bunx",
      "args": ["sentineltm-cli", "serve"]
    }
  }
}
```

**Using pnpx:**
```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "pnpx",
      "args": ["sentineltm-cli", "serve"]
    }
  }
}
```

**Using global installation:**
```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "st",
      "args": ["serve"]
    }
  }
}
```

**IDE-specific paths:**

- **Cursor**: `%APPDATA%\Cursor\User\globalStorage\rooveterinaryinc.roo-cline\settings\cline_mcp_settings.json`
- **Windsurf**: `%APPDATA%\Windsurf\User\globalStorage\codeium.windsurf\mcp.json`
- **VS Code**: `%APPDATA%\Code\User\globalStorage\rooveterinaryinc.roo-cline\settings\cline_mcp_settings.json`

## 🛠️ Essential Commands

### 🤖 Provider Management
```bash
st provider detect              # Show all available AI providers
st set provider gemini   # Set default AI provider
st models list                  # List available models
st models set gemini-1.5-pro    # Set default model
```

**Supported Providers:**
- 🔥 **Gemini** - Google's Gemini models
- 🧠 **Qwen** - Alibaba's Qwen models  
- 🦙 **Ollama** - Local LLM execution
- 🔧 **Codex** - OpenAI Codex models

### 📊 System Status
```bash
st status                       # Show complete system status
st status --json               # JSON format output
st status --watch 5            # Auto-refresh every 5 seconds
```

### 📁 File Operations
```bash
st fs ls "src/**/*.ts"         # List TypeScript files
st fs mkdir "app/models,app/views"  # Create multiple directories
st fs cp src/old.ts src/new.ts # Copy files
st fs mv src/temp.ts src/final.ts   # Move files
st fs rm dist --force          # Remove with force
st fs split large-file.ts --max 300  # Split files by line count
```

### 🖥️ Shell Execution (Secure)
```bash
st shell run "npm test"        # Run npm commands
st shell run "git status"      # Git operations
st shell run "dir" --shell powershell  # Windows PowerShell
st shell run "ls -la" --timeout 30000  # With timeout
```

### 🔍 Code Indexing
```bash
st index run                   # Index entire project
st index status               # Show index statistics
st index search "createTask"  # Search indexed code
st index symbols --name Task  # Find symbols by name
st index doc --path src/app.ts # Get file content from index

# Advanced indexing
st index advanced --root "src" --exclude "*.test.ts" --external "../lib"
st index search-advanced "Task" --types ".ts,.js" --max 100
st index clear-cache          # Clear index cache
```

**MCP Index API:**
```javascript
// ✅ REQUIRED: Always specify root to avoid EBUSY errors
mcp0_index_build({ root: 'project' })  // Scope to project directory
mcp0_index_build({ root: 'src' })      // Or specific subdirectory

// ❌ WRONG: Will scan entire workspace including locked binaries
mcp0_index_build()  // Missing root parameter
mcp0_index_build({ root: '.' })  // Too broad
```

### 📋 Task Management
st task create --title "Fix bug" --priority high --tags bug,urgent
st task list --status open    # List open tasks
st task next                  # Get next priority task
st task update 1 --status done # Update task status
st sub add --parent 1 --title "Write tests"  # Add subtask

```bash
# Automatically parse a PRD file into structured tasks
st task parse-prd --file "path/to/prd.md"

# Estimate the complexity of a task
st task estimate --id 1

# Get AI-powered suggestions for next steps
st task suggest

# Add a dependency between tasks
st task add-dep --task 2 --depends-on 1
```

**MCP Task API:**
```javascript
// Correct usage via MCP
{{ ... }}
mcp0_sentinel_task({ action: 'createTask', payload: {...} })
mcp0_sentinel_task({ action: 'updateTask', payload: { id: 1, status: 'done' } })
mcp0_sentinel_task({ action: 'createSubtask', payload: {...} })
mcp0_sentinel_task({ action: 'listTasks', payload: { status: 'open' } })
mcp0_sentinel_task({ action: 'nextQueuedTask' })

// ❌ WRONG: mcp0_task_update does not exist
```

### ✅ Quality Gates
```bash
st gate run                   # Run all quality checks
st gate run --min 90         # Set minimum score threshold
```

### 🔒 Security Management
```bash
st security whitelist --add "src/**"  # Add to whitelist
st security blacklist --add "node_modules" --reason "Dependencies"
st security whitelist --list   # Show whitelist
st security validate "path"    # Validate path security
```

### 📊 Dashboard & Monitoring
```bash
st dashboard show              # Show project metrics
st dashboard show --json       # JSON output
st dashboard report            # Generate report
st dashboard report --output report.md
```

**Dashboard Output:**
```
📊 SentinelTM Dashboard

┌───────────────┬───────────────┐
│ Project Info  │ Value         │
├───────────────┼───────────────┤
│ Files Indexed │ 245           │
│ Symbols       │ 1,234         │
└───────────────┴───────────────┘

┌─────────────┬───────┐
│ Tasks       │ Count │
├─────────────┼───────┤
│ Total       │ 50    │
│ Pending     │ 15    │
│ In Progress │ 5     │
│ Completed   │ 28    │
└─────────────┴───────┘

┌─────────┬──────────────┐
│ Quality │ Value        │
├─────────┼──────────────┤
│ Score   │ 96/95        │
│ Status  │ ✅ PASSING   │
└─────────┴──────────────┘
```

### 🔄 CI/CD Integration
```bash
st cicd init --provider github # Generate GitHub Actions
st cicd init --provider gitlab # Generate GitLab CI
st cicd run --config cicd.json # Run pipeline locally
st cicd gate                   # Run quality gate
st cicd history --count 10     # Show CI/CD history
```

### 💻 IDE Integration
```bash
st ide list                    # Show available IDE targets
st ide set "VS Code,Cursor"    # Configure specific IDEs
st ide set all                 # Configure all supported IDEs
st ide set windsurf            # Configure single IDE
```

**Supported IDEs:**
- **Code Editors:** VS Code, Cursor, Zed, Windsurf
- **AI Extensions:** Continue, Cline, Codex, Claude, Gemini
- **Specialized Tools:** Kiro, Trae, OpenCode, Roo, Amp, Kilo

## 🔌 MCP Server for AI Agents

Start the MCP server to let AI agents control SentinelTM:

```bash
st serve
```

### 🛠️ Available MCP Tools

AI agents can call these tools via MCP:

**📁 File Operations:**
- `file_read` - Read file contents
- `file_write` - Write/append to files  
- `file_delete` - Delete files/directories
- `file_mkdir` - Create directories

**🖥️ Shell Operations:**
- `shell_execute` - Run commands safely
- `shell_detect` - Detect available shells
- `shell_list` - List allowed commands

**🔍 Code Intelligence:**
- `index_build` - Index project files
- `index_query` - Search code/symbols/docs

**📋 Task Management:**
- `task_create` - Create new tasks
- `task_list` - List tasks with filters
- `task_next` - Get next priority task
- `task_expand` - Get task details + subtasks

**⚙️ System Control:**
- `gate_run` - Execute quality gates
- `sentinel.provider` - Manage AI providers
- `sentinel.status` - Get system status
- `sentinel.security` - Path security validation
- `sentinel.dashboard` - Project monitoring
- `sentinel.cicd` - CI/CD pipeline management

## ⚙️ Configuration

Edit `.sentineltm/config/config.json` or use:

```bash
st config set defaults.provider gemini
st config set thresholds.gate 95
st config set security.shell.allowedCommands '["npm","git","ls"]'
```

### Quality Rules

Create `.sentineltm/config/rules.json` to enforce project standards:

```json
{
  "entrypoint": {
    "filename": "main.py",
    "maxLines": 4,
    "mustImportOnly": true
  },
  "style": {
    "maxLineLength": 79,
    "noSideEffectsOnImport": true,
    "absoluteImportsOnly": true
  },
  "forbidden": {
    "functions": ["print(", "eval(", "exec("],
    "modules": ["subprocess", "os.system"]
  },
  "externalization": {
    "textsPath": "data/texts/*.json",
    "configPath": "data/config/*.json",
    "enforceNoHardcodedStrings": true
  }
}
```

### Key Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `defaults.provider` | Active AI provider | `ollama` |
| `defaults.model` | Default model name | `""` |
| `thresholds.gate` | Minimum quality score | `95` |
| `thresholds.maxFileSizeMB` | File size limit | `5` |
| `security.shell.allowedCommands` | Safe shell commands | `["npm","git","ls",...]` |
| `security.forbidden` | Banned code patterns | `["console.log(","eval("]` |
| `thresholds.maxIndexLines` | Max lines per file before split | `300` |

## 📂 Project Structure

```
src/
├── commands/     # CLI command implementations
├── mcp/         # MCP server and tool definitions  
├── services/    # Core business logic
├── utils/       # Shared utilities
└── constants/   # Default configurations

.sentineltm/
├── config/      # User configuration
├── db/         # SQLite database
├── profiles/   # Generated IDE configs
└── scripts/    # Provider shims
```

## 🔧 AI Provider Setup

### Gemini
```bash
npm install -g @google/generative-ai-cli
gemini config set apiKey YOUR_API_KEY
```

### Qwen
```bash
npm install -g qwen-cli
qwen config set apiKey YOUR_API_KEY
```

### Ollama
```bash
# Install Ollama from https://ollama.ai
ollama pull llama2
```

### Codex
```bash
npm install -g codex-cli
codex config set apiKey YOUR_OPENAI_KEY
```

## 🔄 Development Workflow

```bash
# Development mode
npm run dev -- --help

# Testing
npm run test
npm run lint

# Build
npm run build

# Quality gate
npm run gate

# CI check
npm run ci:check
```

## 🔧 Troubleshooting

**🚫 Provider not found:**
```bash
st provider detect  # Check if provider is in PATH
```

**❌ Gate failing:**
```bash
st gate run --min 95  # Run with retries
```

**🔌 MCP connection issues:**
```bash
st serve  # Ensure server is running
DEBUG=sentineltm:* st serve  # Enable debug logging
```

**🛣️ Path errors ("must stay within workspace"):**
```bash
# ❌ WRONG: Absolute paths fail
mcp0_file_read({ path: 'd:\\project\\file.ts' })

# ✅ CORRECT: Use workspace-relative paths
mcp0_file_read({ path: 'project/file.ts' })
mcp0_file_write({ path: 'project/src/new.ts', content: '...' })
```

**📄 Large files:**
```bash
st fs split large-file.ts --max 300  # Split before indexing
```

**🪟 Windows-specific issues:**
- Ensure PowerShell execution policy allows scripts
- Use `st shell run "command" --shell powershell` for PowerShell commands
- Provider detection improved for Windows PATH resolution



## 📄 License

ISC License - see [LICENSE](./LICENSE) file for details

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines first.

## 📦 Installation

```bash
# NPM
npm install -g sentineltm-cli

# Yarn
yarn global add sentineltm-cli

# PNPM
pnpm add -g sentineltm-cli

# Bun
bun add -g sentineltm-cli

# Without installation
npx sentineltm-cli serve
bunx sentineltm-cli serve
pnpx sentineltm-cli serve
```

🔗 [npmjs.com/package/sentineltm-cli](https://www.npmjs.com/package/sentineltm-cli)

## 🔗 Links

- **GitHub**: [Amin-Azmoodehh/Sentinel](https://github.com/Amin-Azmoodehh/Sentinel)
- **Issues**: [Report bugs](https://github.com/Amin-Azmoodehh/Sentinel/issues)
- **Documentation**: [Full docs](./DOCUMENTATION.md)

---


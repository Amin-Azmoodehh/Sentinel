# 🛡️ SentinelTM: Your AI Development Companion

[![npm version](https://img.shields.io/npm/v/sentineltm-cli?style=for-the-badge&logo=npm&color=red)](https://www.npmjs.com/package/sentineltm-cli) 
[![Downloads](https://img.shields.io/npm/dm/sentineltm-cli?style=for-the-badge&logo=npm&color=orange)](https://www.npmjs.com/package/sentineltm-cli)
[![License](https://img.shields.io/badge/license-ISC-green?style=for-the-badge)](https://github.com/Amin-Azmoodehh/Sentinel)
[![Stars](https://img.shields.io/github/stars/Amin-Azmoodehh/Sentinel?style=for-the-badge&logo=github&color=yellow)](https://github.com/Amin-Azmoodehh/Sentinel)

> **Transform Your IDE into an Intelligent Development Environment**  
> Agent-Oriented Architecture • Context-Aware AI • Zero Tolerance Quality

SentinelTM (`st`) is a revolutionary **Agent Companion** that transforms how you build software. Combining enterprise-grade CLI tools with cutting-edge MCP (Model Context Protocol), intelligent workflows, and context-aware AI, it provides a seamless development experience across 20+ AI providers and 23+ IDEs.

## 🌟 Revolutionary Features (v2.2+)

### 🤝 Friendly AI Companion
- **Personalized Interaction**: Configure tone, language, and personality through `friendly.yml`
- **Smart Aliases**: Use natural language commands (Persian/English)
- **Context Memory**: Remembers your preferences and workflows
- **Encouragement System**: Celebrates your successes and helps with challenges

### 🎟️ Context Window Monitor
- **Real-Time Tracking**: Monitor token usage across all AI operations
- **Smart Warnings**: Get alerts at 85% and 95% usage
- **Estimated Turns**: Know how many interactions remain
- **MCP Integration**: Available as `sentinel_context_monitor` tool

### 🏗️ High-Level Workflows
- **Declarative Operations**: From imperative commands to intelligent workflows
- **Component Scaffolding**: `st workflow component UserProfile` generates complete structure
- **API Endpoints**: Auto-generate controllers with tests and validation
- **Project-Wide Refactoring**: Rename symbols across entire codebase

### 🧠 Context Enrichment System
- **Pattern Detection**: Learns from your existing code
- **Smart Suggestions**: AI generates code matching your project style
- **Dependency Analysis**: Understands your tech stack
- **Convention Extraction**: Follows your naming and structure patterns

### 📜 Named Scripts System
- **Reusable Workflows**: Define complex operations in `scripts.yml`
- **Security Validation**: Whitelist/blacklist commands
- **Parameter Substitution**: Dynamic script execution
- **Confirmation Prompts**: For sensitive operations

## ✨ Core Capabilities

- 🎯 **Zero Tolerance Quality**: AI-powered code review with structured feedback
- 🔐 **Security-First**: Sandboxed file system and controlled shell execution
- 🤖 **Provider Agnostic**: Works with Ollama, OpenAI, Claude, Gemini, Mistral, OpenRouter, and any OpenAI-compatible API
- 🚀 **Interactive Setup**: Guided configuration with smart defaults
- 📊 **Quality Gates**: Automated compliance checking with actionable insights
- 🎨 **IDE Integration**: One-command setup for VS Code, Cursor, Zed, Windsurf, and 19+ more

---

## 🚀 Quick Start (2 Minutes)

### 1️⃣ Install

```bash
npm install -g sentineltm-cli@latest
```

### 2️⃣ Configure Your AI Provider (Interactive)

SentinelTM provides an interactive setup wizard for seamless configuration:

```bash
st set provider
```

This will guide you through:
1. 📋 **Select Provider**: Choose from Ollama, OpenAI, Claude, Gemini, Mistral, or OpenRouter
2. 🔑 **Enter API Key**: Provide your API credentials (or skip for Ollama)
3. 🤖 **Select Model**: Pick from available models (auto-fetched from the provider)

#### Example Providers:

**Ollama (Local, Free)**
```bash
# Install Ollama first: https://ollama.ai
ollama pull llama3

# Then configure
st set provider
# → Select: ollama
# → API Key: (leave blank)
# → Model: llama3
```

**OpenRouter (Best for Production)**
```bash
st set provider
# → Select: openrouter
# → API Key: sk-or-v1-xxxxx
# → Model: deepseek/deepseek-chat or x-ai/grok-2-latest
```

**OpenAI**
```bash
st set provider
# → Select: openai
# → API Key: sk-xxxxx
# → Model: gpt-4-turbo
```

### 3️⃣ Set Up IDE Integration (Interactive)

Configure your development environment with one command:

```bash
st set ide
```

This will:
1. ✅ **Select IDEs**: Choose from VS Code, Cursor, Zed, Windsurf, Continue, Cline, etc.
2. 🤖 **Configure Provider**: Select AI provider and model (if not already set)
3. 📜 **Apply Rules**: Optionally apply Zero Tolerance coding standards

### 4️⃣ Verify Installation

```bash
# Check provider status
st provider status

# Run quality gate
st gate run
```

---

## 📚 Command Reference

### 🤖 Provider Management

| Command | Description |
|---------|-------------|
| `st set provider` | **Interactive setup** for AI provider (recommended) |
| `st provider configure` | Alternative interactive setup command |
| `st provider set <name>` | Set existing provider as default |
| `st provider list` | List available models from provider |
| `st provider status` | Show current provider and model |
| `st provider detect` | Auto-detect available providers |

### 🎨 IDE Configuration

| Command | Description |
|---------|-------------|
| `st set ide` | **Interactive IDE setup** (recommended) |
| `st ide set [names...]` | Configure specific IDEs |
| `st ide list` | List all supported IDE targets |

**Supported IDEs**: VS Code, Cursor, Zed, Windsurf, Continue, Cline, Codex, Claude, Gemini, OpenCode, Roo, Amp, Kilo, Trae, Kiro

### ✅ Quality Gates

| Command | Description |
|---------|-------------|
| `st gate run` | Run all quality checks |
| `st gate run --min 90` | Run with custom passing score |

**Built-in Checks**:
- 🧪 Tests
- 🎨 Linting & Formatting
- 🏗️ Build Verification
- 🔒 Security Scan
- 📁 Project Structure
- 🧹 Code Hygiene
- 🤖 **AI Rule Check** (enforces Zero Tolerance standards)

### 📂 File System Operations

| Command | Description |
|---------|-------------|
| `st fs ls [path]` | List files and directories |
| `st fs read <path>` | Read file contents |
| `st fs write <path>` | Write to file |
| `st fs search <query>` | Search across codebase |

### 🔍 Code Indexing

| Command | Description |
|---------|-------------|
| `st index build` | Build code index |
| `st index status` | Show index statistics |
| `st index search <query>` | Search indexed code |

### 📊 Dashboard & Reporting

| Command | Description |
|---------|-------------|
| `st dashboard report` | Full project health report |
| `st dashboard metrics` | Key metrics summary |
| `st status` | Quick project overview |

### 🛠️ Task Management

| Command | Description |
|---------|-------------|
| `st task list` | List all tasks |
| `st task create --title "Fix bug"` | Create new task |
| `st task update <id> --status done` | Update task status |
| `st task delete <id> --force` | Delete task |

### 🏗️ Workflow Commands (v2.2+)

| Command | Description |
|---------|-------------|
| `st workflow analyze` | Analyze project patterns |
| `st workflow component <name>` | Scaffold React component with tests |
| `st workflow api <name> --method POST` | Create API endpoint |
| `st workflow rename <old> <new>` | Refactor symbol across project |
| `st workflow batch --config workflow.json` | Execute batch operations |

### 🎟️ Context Monitor (v2.2+)

| Command | Description |
|---------|-------------|
| `st monitor stats` | Show token usage statistics |
| `st monitor summary` | Session summary with history |
| `st monitor recent` | Recent operations |
| `st monitor reset` | Reset monitoring session |

### 🤝 Friendly Companion (v2.2+)

| Command | Description |
|---------|-------------|
| `st alias list` | Show all command aliases |
| `st friendly greet` | Get personalized greeting |
| `st friendly preferences` | Show your preferences |
| `st shell scripts` | List named scripts |
| `st shell exec <script>` | Execute named script |

**Example Aliases** (configure in `friendly.yml`):
```yaml
aliases:
  وضعیت: "st status"                    # Status
  تست_کامل: "st gate run"              # Full test
  کامپوننت_جدید: "st workflow component $1"  # New component
```

---

## 🎯 Zero Tolerance Contract

SentinelTM enforces strict coding standards through its **Zero Tolerance Contract** system:

- ✅ Type safety and hints required
- ✅ No hardcoded values (strings, numbers, URLs)
- ✅ Configuration externalized to YAML
- ✅ Modular architecture (max 300 lines per file)
- ✅ PEP8/ESLint compliance
- ✅ Comprehensive error handling
- ✅ Security best practices

See [ZERO_TOLERANCE_CONTRACT.md](./ZERO_TOLERANCE_CONTRACT.md) for full details.

---

## 🔧 Configuration Files

SentinelTM uses multiple configuration files for maximum flexibility:

### Core Configuration (`.sentineltm/config/config.json`)
```json
{
  "defaults": {
    "provider": "openrouter",
    "model": "deepseek/deepseek-chat"
  },
  "providers": {
    "openrouter": {
      "type": "openai-compatible",
      "baseURL": "https://openrouter.ai/api",
      "apiKey": "sk-or-v1-xxxxx"
    }
  }
}
```

### Friendly Companion (`friendly.yml`) - v2.2+
```yaml
personality:
  tone: "enthusiastic_partner"
  use_emojis: true
  user_name: "Your Name"
  
aliases:
  status: "st status"
  test: "st gate run"
  component: "st workflow component $1"

preferences:
  default_component_path: "src/components"
  min_quality_score: 85
  message_language: "english"  # or "persian"
```

### Named Scripts (`scripts.yml`) - v2.2+
```yaml
scripts:
  install: "npm install"
  test: "npm test"
  deploy:
    - "npm run build"
    - "npm test"
    - "st gate run"
    - "npm publish"

security:
  allowedCommands: ["npm", "git", "st"]
  requireConfirmation: ["deploy", "publish"]
```

### Project Rules (`project_rules.md`) - v2.1+
```markdown
# Project Coding Standards

- All state management must use Zustand
- API calls through `src/api/client.ts` only
- Use react-query for data fetching
- Functional components with TypeScript types
```

---

## 🔌 MCP Tools Integration

SentinelTM provides powerful MCP tools for IDE integration:

### Available Tools

| Tool | Description | Actions |
|------|-------------|---------|
| `sentinel_task` | Task management | create, list, update, delete, subtasks |
| `sentinel_fs` | File operations | list, read, write, move, copy, remove |
| `sentinel_shell` | Shell execution | execute, detectShells, listAllowed |
| `sentinel_index` | Code indexing | build, search, symbols, status |
| `sentinel_context_monitor` | Token tracking | getStats, recordUsage, getWarning, getSummary |
| `sentinel_security` | Security validation | validatePath, whitelist, blacklist |
| `sentinel_dashboard` | Project metrics | getMetrics, generateReport |
| `sentinel_gate` | Quality checks | run with configurable threshold |

### Example MCP Usage

```javascript
// Monitor context window
const stats = await mcp.callTool('sentinel_context_monitor', {
  action: 'getStats'
});
// Returns: { usagePercentage: 65, remainingTurns: 12, warningLevel: 'safe' }

// Record AI operation
await mcp.callTool('sentinel_context_monitor', {
  action: 'recordUsage',
  payload: {
    inputTokens: 1500,
    outputTokens: 800,
    operation: 'code_generation'
  }
});

// Scaffold component
await mcp.callTool('sentinel_task', {
  action: 'createTask',
  payload: {
    title: 'Build UserProfile component',
    priority: 'high'
  }
});
```

---

## 📖 Advanced Guides

- [**API Integration Guide**](./API_INTEGRATION.md) - Deep dive into provider configuration
- [**Zero Tolerance Contract**](./ZERO_TOLERANCE_CONTRACT.md) - Complete coding standards
- [**MCP Server Usage**](./docs/MCP.md) - Using SentinelTM as an MCP server

---

## 🆘 Troubleshooting

**Provider not working?**
```bash
st provider status    # Check configuration
st provider detect    # Auto-detect available providers
```

**IDE configuration not applying?**
```bash
st ide list          # Check supported IDEs
st set ide           # Re-run interactive setup
```

**Quality gate failing?**
```bash
st gate run --min 70  # Lower threshold for testing
```

---

## 🤝 Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

---

## 📄 License

ISC License © 2025 Amin Azmoodeh

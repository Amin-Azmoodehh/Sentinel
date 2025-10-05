# 🛡️ SentinelTM: The Ultimate AI-Powered Development Guardian

[![npm version](https://img.shields.io/npm/v/sentineltm-cli?style=for-the-badge&logo=npm&color=red)](https://www.npmjs.com/package/sentineltm-cli) 
[![Downloads](https://img.shields.io/npm/dm/sentineltm-cli?style=for-the-badge&logo=npm&color=orange)](https://www.npmjs.com/package/sentineltm-cli)
[![License](https://img.shields.io/badge/license-ISC-green?style=for-the-badge)](https://github.com/Amin-Azmoodehh/Sentinel)
[![Stars](https://img.shields.io/github/stars/Amin-Azmoodehh/Sentinel?style=for-the-badge&logo=github&color=yellow)](https://github.com/Amin-Azmoodehh/Sentinel)

> **The World's Most Advanced AI Development Orchestrator**  
> Enforce Zero Tolerance Quality Standards with Military-Grade Precision

**Version 2.3.6** — Critical MCP workspace bug fixed! 🎉

SentinelTM (`st`) is a revolutionary AI-powered development guardian that transforms how you build software. Combining enterprise-grade CLI tools with cutting-edge MCP (Model Context Protocol) capabilities, it enforces uncompromising quality standards while seamlessly integrating with 20+ AI providers and 23+ IDEs.

## ✨ What Makes SentinelTM Different?

- 🎯 **Zero Tolerance Quality**: Enforces strict coding standards with AI-powered validation
- 🔐 **Security-First**: Sandboxed file system and controlled shell execution
- 🤖 **Provider Agnostic**: Works with Ollama, OpenAI, Claude, Gemini, Mistral, OpenRouter, and any OpenAI-compatible API
- 🚀 **Interactive Setup**: Guided configuration with smart defaults
- 📊 **Quality Gates**: Automated code review and compliance checking
- 🎨 **IDE Integration**: One-command setup for VS Code, Cursor, Zed, Windsurf, and more

## 🧹 Code Formatting & Linting (Built-in)

SentinelTM now ships built-in helpers to keep your codebase clean without extra setup.

- **Format (all/common languages)**
  - `st fmt` (auto-detect) or `st fmt js|ts|py|go|rs|sh|md`
- **Lint**
  - `st lint` (auto-detect) or `st lint js|ts|py|sh`
- **Python helpers (Ruff)**
  - `st py init-config` → creates `pyproject.toml` (and optional pre-commit)
  - `st py format` → `ruff format .`
  - `st py lint` → `ruff check . --fix`

Notes:
- Tools are used if available (e.g., `prettier`, `eslint`, `ruff`, `gofmt`, `rustfmt`, `shfmt`). If not installed, helpful guidance is shown.
- Minimal defaults, zero clutter. Use `st init-config` to generate minimal configs (`.eslintrc.json`, `.prettierrc`, `pyproject.toml`).

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
| `st task add <title>` | Create new task |
| `st task done <id>` | Mark task as complete |

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

## 🔧 Configuration

All configuration is stored in `.sentineltm/config/config.json`:

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

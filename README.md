# 🤖 SentinelTM: Local-First AI Orchestrator

[![npm version](https://img.shields.io/npm/v/sentineltm-cli)](https://www.npmjs.com/package/sentineltm-cli) [![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/Amin-Azmoodehh/Sentinel) [![License](https://img.shields.io/badge/license-ISC-green)](https://github.com/Amin-Azmoodehh/Sentinel)

SentinelTM (`st`) is a local-first AI agent orchestrator that combines a powerful CLI with an MCP (Model Control Protocol) server. It provides secure file operations, shell execution, code indexing, and quality gates—all controlled by your preferred AI provider via direct API calls.

## 🚀 Quick Start

### 1. Installation

```bash
npm install -g sentineltm-cli@latest
```

### 2. Configure an AI Provider (API-First)

SentinelTM uses direct API calls for reliability. Choose one:

#### Option A: Ollama (Local & Recommended)

```bash
# 1. Install Ollama (https://ollama.ai) and pull a model
ollama pull llama3

# 2. Configure SentinelTM to use it
st provider set ollama --type ollama --base-url http://localhost:11434 --model llama3
```

#### Option B: OpenAI, Claude, or other Cloud Providers

```bash
# Example for OpenAI
st provider set openai --type openai-compatible --base-url https://api.openai.com --api-key sk-YOUR_KEY --model gpt-3.5-turbo
```

This command updates your project's `.sentineltm/config/config.json` file.

### 3. Verify Setup

```bash
# Check provider status (should show as available)
st provider status

# Run the Quality Gate to test AI integration
st gate status
```

## 🎯 Core Features

- **API-Based Providers**: Reliable integration with Ollama, OpenAI, Claude, and any OpenAI-compatible endpoint.
- **Secure File System**: Whitelist/blacklist for safe file access.
- **Safe Shell Execution**: Adaptive syntax for secure commands.
- **Code Indexing**: Advanced search and symbol indexing.
- **Quality Gates**: Automated checks for code quality, including an AI-powered rule check.
- **Task Management**: Create, list, and manage development tasks.
- **Dashboard**: Project health and metrics monitoring.

## 📚 Key Commands

| Command | Description |
|---|---|
| `st provider set <name> [flags]` | Configure an AI provider with API details. |
| `st provider list` | List available models from the configured provider. |
| `st gate status` | Run quality checks, including the AI Rule Check. |
| `st index status` | View codebase index status. |
| `st dashboard report` | Show a project health dashboard. |
| `st fs ls` | List files in the project. |
| `st task list` | Manage development tasks. |
| `st ide set <name>` | Generate IDE configuration files. |

For detailed guides, see:
- [**API Integration Guide**](./API_INTEGRATION.md)
- [**Zero Tolerance Contract**](./ZERO_TOLERANCE_CONTRACT.md)

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📄 License

ISC License

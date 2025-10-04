# 🔌 SentinelTM API Integration Guide (v1.6+)

This guide explains how to configure and use AI providers with SentinelTM's API-first architecture.

## 🚀 Overview

Since v1.6.0, SentinelTM uses direct API calls instead of external CLI tools for better reliability, performance, and user experience. This resolves previous issues with provider availability and command length limits.

## ⚙️ Configuration

Provider details are managed in your project's `.sentineltm/config/config.json` file. You can edit this file directly or use the `st provider set` command.

### Configuration Schema

```json
{
  "defaults": {
    "provider": "ollama", // The currently active provider
    "model": "llama3"       // The default model for the active provider
  },
  "providers": {
    "ollama": {
      "type": "ollama",
      "baseUrl": "http://localhost:11434"
    },
    "openai": {
      "type": "openai-compatible",
      "baseUrl": "https://api.openai.com",
      "apiKey": "sk-YOUR_KEY_HERE"
    }
  }
}
```

### Key Fields

- `defaults.provider`: Name of the active provider (must match a key in `providers`).
- `defaults.model`: Default model ID to use for the active provider.
- `providers`: A dictionary of all configured providers.
  - `type`: The provider type. Can be `ollama` or `openai-compatible`.
  - `baseUrl`: The base URL of the provider's API endpoint.
  - `apiKey`: Your secret API key (only for cloud providers).

## 🔧 Setup Instructions

The recommended way to configure providers is with the `st provider set` command.

### Option 1: Ollama (Local & Recommended)

This is the easiest way to get started, as it runs locally and requires no API key.

```bash
# 1. Install Ollama (https://ollama.ai) and pull a model
ollama pull llama3

# 2. Configure SentinelTM to use it
st provider set ollama --type ollama --base-url http://localhost:11434 --model llama3
```

### Option 2: OpenAI, Claude, or other Cloud Providers

Use the `openai-compatible` type for any provider that follows OpenAI's API structure.

```bash
# Example for OpenAI
st provider set openai --type openai-compatible --base-url https://api.openai.com --api-key sk-YOUR_KEY --model gpt-3.5-turbo

# Example for Anthropic Claude
st provider set claude --type openai-compatible --base-url https://api.anthropic.com --api-key sk-ant-YOUR_KEY --model claude-3-sonnet-20240229
```

## 🧪 Testing and Validation

After configuring a provider, verify that it's working correctly.

```bash
# 1. Check provider status
# This will attempt to connect to the endpoint and list models.
st provider status

# 2. Run the Quality Gate
# The AI Rule Check will use the configured provider.
st gate status
```

## 🔍 Troubleshooting

| Error | Cause & Solution |
|---|---|
| `Provider '...' is not available.` | The provider is not configured in `config.json`. Run `st provider set ...` to add it. |
| `Connection failed` / `ECONNREFUSED` | The `baseUrl` is incorrect, or the local server (like Ollama) is not running. |
| `401 Unauthorized` | The `apiKey` is missing, invalid, or expired. |
| `AI Rule Check fails` | This is expected if the provider is not configured or reachable. The gate score will be 60/100. |

## 🔄 Migrating from CLI-based Providers (v1.5.x)

If you used SentinelTM before v1.6.0, your old configuration is now obsolete.

1.  **Update SentinelTM**: `npm install -g sentineltm-cli@latest`
2.  **Remove Old CLIs**: You no longer need to install `qwen-cli`, `gemini-cli`, etc.
3.  **Reconfigure Providers**: Use the `st provider set` command as described above to set up your providers with their API details.


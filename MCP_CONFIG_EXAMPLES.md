# MCP Configuration Examples

This document provides ready-to-use MCP configuration examples for different IDEs and setups.

## Quick Start

Choose the configuration method that best suits your needs:

### 1. Using npx (Recommended - No Installation Required)

**Pros:** Always uses the latest version, no global installation needed
**Cons:** Slightly slower startup

```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "npx",
      "args": ["-y", "sentineltm-cli", "serve", "--mcp-stdio"],
      "env": {}
    }
  }
}
```

### 2. Using Global Installation

**Pros:** Faster startup, version control
**Cons:** Requires manual updates

```bash
# First, install globally
npm install -g sentineltm-cli

# Then use this config:
```

```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "st",
      "args": ["serve", "--mcp-stdio"],
      "env": {}
    }
  }
}
```

### 3. Using Bun (Fastest)

```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "bunx",
      "args": ["sentineltm-cli", "serve", "--mcp-stdio"],
      "env": {}
    }
  }
}
```

### 4. Using pnpm

```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "pnpx",
      "args": ["sentineltm-cli", "serve", "--mcp-stdio"],
      "env": {}
    }
  }
}
```

## IDE-Specific Configurations

### Windsurf

**Config File Location:**
- Windows: `%APPDATA%\Windsurf\User\globalStorage\codeium.windsurf\mcp.json`
- macOS: `~/Library/Application Support/Windsurf/User/globalStorage/codeium.windsurf/mcp.json`
- Linux: `~/.config/Windsurf/User/globalStorage/codeium.windsurf/mcp.json`

**Configuration:**
```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "npx",
      "args": ["-y", "sentineltm-cli", "serve", "--mcp-stdio"],
      "env": {}
    }
  }
}
```

### Cursor

**Config File Location:**
- Windows: `%APPDATA%\Cursor\User\globalStorage\rooveterinaryinc.roo-cline\settings\cline_mcp_settings.json`
- macOS: `~/Library/Application Support/Cursor/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`
- Linux: `~/.config/Cursor/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`

**Configuration:**
```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "npx",
      "args": ["-y", "sentineltm-cli", "serve", "--mcp-stdio"],
      "env": {}
    }
  }
}
```

### VS Code (with Cline extension)

**Config File Location:**
- Windows: `%APPDATA%\Code\User\globalStorage\rooveterinaryinc.roo-cline\settings\cline_mcp_settings.json`
- macOS: `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`
- Linux: `~/.config/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`

**Configuration:**
```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "npx",
      "args": ["-y", "sentineltm-cli", "serve", "--mcp-stdio"],
      "env": {}
    }
  }
}
```

### Zed

**Config File Location:**
- All platforms: Project root `.zed/settings.json`

**Configuration:**
```json
{
  "assistant.default": "sentinel",
  "assistant.providers": {
    "sentinel": {
      "command": "st",
      "args": ["serve", "--mcp-stdio"]
    }
  }
}
```

## Advanced Configurations

### With Custom Environment Variables

```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "st",
      "args": ["serve", "--mcp-stdio"],
      "env": {
        "DEBUG": "sentineltm:*",
        "NODE_ENV": "production"
      }
    }
  }
}
```

### With HTTP Transport (for remote connections)

```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "st",
      "args": ["serve", "--transport", "http", "--port", "8008"],
      "env": {}
    }
  }
}
```

### With SSE Transport (for real-time updates)

```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "st",
      "args": ["serve", "--transport", "sse", "--port", "8008"],
      "env": {}
    }
  }
}
```

## Troubleshooting

### Server Not Starting

1. **Check if SentinelTM is installed:**
   ```bash
   st -v
   ```

2. **Try running the server manually:**
   ```bash
   st serve --mcp-stdio
   ```
   
   You should see: `ℹ MCP Server connected and ready.`

3. **Check IDE logs** for error messages

### Version Mismatch

If you're using global installation and experiencing issues:

```bash
# Update to latest version
npm install -g sentineltm-cli@latest

# Verify version
st -v
```

### Permission Issues (Windows)

If you get permission errors:

```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Path Issues

Make sure the command is in your PATH:

```bash
# Windows (PowerShell)
where.exe st

# macOS/Linux
which st
```

## Configuration with Provider Settings

You can also specify default provider and model in the MCP config:

```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "npx",
      "args": ["-y", "sentineltm-cli", "serve", "--mcp-stdio"],
      "env": {}
    }
  },
  "defaults": {
    "provider": "qwen",
    "model": "qwen-coder-flash"
  }
}
```

**Supported Providers:**
- `qwen` - Alibaba Qwen models (default)
- `gemini` - Google Gemini models
- `ollama` - Local LLM execution
- `codex` - OpenAI Codex models

## Auto-Configuration

SentinelTM can automatically configure your IDE:

```bash
# Configure all supported IDEs
st ide set all

# Configure specific IDE
st ide set windsurf
st ide set cursor
st ide set "VS Code"

# List available IDE targets
st ide list
```

This will automatically create the correct `mcp.json` or `settings.json` files in the appropriate locations.

## Verification

After configuration, restart your IDE and check:

1. **IDE should show SentinelTM in the MCP servers list**
2. **You should be able to use SentinelTM tools through your AI assistant**
3. **Check IDE's MCP logs for connection status**

## Need Help?

- **Documentation:** [README.md](./README.md)
- **Issues:** [GitHub Issues](https://github.com/Amin-Azmoodehh/Sentinel/issues)
- **Latest Version:** [npm](https://www.npmjs.com/package/sentineltm-cli)

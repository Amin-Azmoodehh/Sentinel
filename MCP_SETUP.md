# SentinelTM MCP Server Setup

**Version: 2.3.6+** — The workspace `cwd` bug has been fixed! 🎉

## Quick Start

SentinelTM now correctly handles the `SENTINEL_WORKSPACE` environment variable. Simply configure your IDE's `mcp.json` with the correct settings, and the server will automatically operate in your project directory.

### For Windsurf

**Recommended**: Use `st ide set` command to automatically generate the correct configuration:

```bash
cd /path/to/your/project
st ide set
# Select Windsurf from the list
```

Or manually create/edit `.windsurf/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "st",
      "args": ["serve", "--mcp-stdio"],
      "env": {
        "SENTINEL_WORKSPACE": "D:\\YourProject",
        "SENTINEL_LOG_LEVEL": "info",
        "SENTINEL_AUTO_INDEX": "true"
      }
    }
  }
}
```

**⚠️ Important**: Use **absolute paths** for `SENTINEL_WORKSPACE`. Some IDEs don't expand `${workspaceFolder}` correctly, so use the full project path (e.g., `D:\\MyProject` on Windows or `/home/user/MyProject` on Linux/Mac).

### For Cursor

**Recommended**: Use `st ide set` command:

```bash
cd /path/to/your/project
st ide set
# Select Cursor from the list
```

Or manually create/edit `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "st",
      "args": ["serve", "--mcp-stdio"],
      "env": {
        "SENTINEL_WORKSPACE": "D:\\YourProject",
        "SENTINEL_LOG_LEVEL": "info",
        "SENTINEL_AUTO_INDEX": "true"
      }
    }
  }
}
```

**⚠️ Important**: Use **absolute paths** for reliability.

### For Claude Desktop

Claude Desktop requires absolute paths. Edit your configuration file:

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "st",
      "args": ["serve", "--mcp-stdio"],
      "env": {
        "SENTINEL_WORKSPACE": "D:\\Work Directory\\V2",
        "SENTINEL_LOG_LEVEL": "info",
        "SENTINEL_AUTO_INDEX": "true"
      }
    }
  }
}
```

**⚠️ Important**: Claude Desktop does NOT support `${workspaceFolder}`. Use absolute paths and escape backslashes on Windows (e.g., `D:\\\\MyProject`).

## Installation & Verification

### 1. Install or Update SentinelTM

```bash
npm install -g sentineltm-cli@latest
```

Verify the version (should be `2.3.6` or higher):

```bash
st --version
```

### 2. Configure Your IDE

Follow the configuration steps for your IDE above (Windsurf, Cursor, or Claude Desktop).

### 3. Restart Your IDE

After editing the `mcp.json` configuration, **completely restart your IDE** (not just reload the window).

### 4. Verify the Setup

Test that file operations work correctly in your project directory:

```javascript
// In your AI chat, ask:
"Using sentineltm, create a test file called 'mcp_test.txt' in the project root"
```

✅ **Success**: The file appears in your project root  
❌ **Failure**: The file appears elsewhere or you get an error

If verification fails, check the logs and ensure `SENTINEL_WORKSPACE` is set correctly.

### Environment Variables Reference

- `SENTINEL_WORKSPACE`: Project root directory (REQUIRED for MCP server)
- `SENTINEL_LOG_LEVEL`: Logging level (debug, info, warn, error)
- `SENTINEL_AUTO_INDEX`: Auto-index project on startup (true/false)

## Alternative: Using CLI Directly

If you don't want to set environment variables, you can use SentinelTM CLI directly in your project directory:

```bash
cd /path/to/your/project
st index build
st task list
st gate run
```

The CLI automatically uses the current working directory.

## What's New in v2.3.6

### 🎉 Critical Bug Fix: Workspace `cwd` Issue Resolved

Previous versions had a timing issue where `SENTINEL_WORKSPACE` was not applied early enough, causing the server to operate in the wrong directory. This has been completely fixed by moving workspace initialization to an `async initialize()` method that runs before any server operations begin.

**Impact**: File operations now work correctly in your project directory from the first command!

### Other Improvements

- Cleaner and more maintainable server initialization code
- Better error logging for workspace configuration issues
- Improved documentation and setup guides

---

## Troubleshooting

### File operations fail with "Path must stay within workspace"

**Solution**: Ensure `SENTINEL_WORKSPACE` is set correctly in your IDE's `mcp.json`. The path should be absolute and point to your project root.

### Server operates in wrong directory

**Solution**: 
1. Verify you're using `sentineltm-cli@2.3.6` or higher: `st --version`
2. Check that `SENTINEL_WORKSPACE` is set in `mcp.json`
3. Completely restart your IDE (not just reload)

### `st` command not found

**Solution**: Install SentinelTM globally: `npm install -g sentineltm-cli@latest`

---

For more help, visit the [GitHub repository](https://github.com/Amin-Azmoodehh/Sentinel) or open an issue.

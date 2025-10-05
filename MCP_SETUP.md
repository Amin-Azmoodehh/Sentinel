# SentinelTM MCP Server Setup

## Critical: Setting the Workspace Root

When using SentinelTM as an MCP server (e.g., with Windsurf, Cursor, or other AI IDEs), you **MUST** set the `SENTINEL_WORKSPACE` environment variable to your project root directory. Otherwise, all file operations will execute in the wrong directory (the IDE's installation folder).

### For Windsurf

Edit your `~/.windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "st",
      "args": ["serve", "--mcp-stdio"],
      "env": {
        "SENTINEL_WORKSPACE": "/absolute/path/to/your/project",
        "SENTINEL_LOG_LEVEL": "info",
        "SENTINEL_AUTO_INDEX": "true"
      }
    }
  }
}
```

### For Cursor / Claude Desktop

Edit your configuration file:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "st",
      "args": ["serve", "--mcp-stdio"],
      "env": {
        "SENTINEL_WORKSPACE": "/absolute/path/to/your/project"
      }
    }
  }
}
```

### Important Notes

1. **Use Absolute Paths**: Always use absolute paths for `SENTINEL_WORKSPACE`
   - ✅ Good: `/home/user/projects/myapp` or `C:\\Users\\user\\projects\\myapp`
   - ❌ Bad: `./myapp` or `../projects/myapp`

2. **Windows Users**: Use double backslashes in JSON
   - ✅ Good: `"SENTINEL_WORKSPACE": "C:\\\\Users\\\\user\\\\projects\\\\myapp"`
   - ✅ Alternative: `"SENTINEL_WORKSPACE": "C:/Users/user/projects/myapp"`

3. **Restart Required**: After editing the configuration, restart your IDE completely

### Verifying the Setup

After restarting your IDE, test file operations:

```javascript
// In your AI chat:
"Create a directory called 'test_folder' using sentineltm"
```

If the bug is fixed, the folder should appear in your project root, not in the IDE's installation directory.

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

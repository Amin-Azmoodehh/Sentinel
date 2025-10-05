# SentinelTM MCP Server Setup

## Critical: Setting the Workspace Root

When using SentinelTM as an MCP server (e.g., with Windsurf, Cursor, or other AI IDEs), you **MUST** set the `SENTINEL_WORKSPACE` environment variable to your project root directory. Otherwise, all file operations will execute in the wrong directory (the IDE's installation folder).

### For Windsurf

Edit your `.windsurf/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "st",
      "args": ["serve", "--mcp-stdio"],
      "env": {
        "SENTINEL_WORKSPACE": "${workspaceFolder}",
        "SENTINEL_LOG_LEVEL": "info",
        "SENTINEL_AUTO_INDEX": "true"
      }
    }
  }
}
```

**Note**: `${workspaceFolder}` is a Windsurf variable that automatically resolves to your project root. No need to hardcode paths!

**Friendly Mode**: A sample `friendly.yml` is included in `.windsurf/` folder. Copy it to your project root to enable the encouraging collaborative interaction model with AI.

### For Cursor

Cursor uses a workspace-specific `.cursor/mcp.json` file. Create it in your project root:

```json
{
  "mcpServers": {
    "sentineltm": {
      "command": "st",
      "args": ["serve", "--mcp-stdio"],
      "env": {
        "SENTINEL_WORKSPACE": "${workspaceFolder}"
      }
    }
  }
}
```

**Note**: Cursor also supports `${workspaceFolder}` variable!

### For Claude Desktop

Claude Desktop requires absolute paths. Edit your configuration file:

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

**Note**: Claude Desktop does NOT support variables, so you must use absolute paths.

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

## Friendly Mode (Optional)

SentinelTM includes an **Encouraging Collaborative Interaction Model** that enhances AI-human collaboration through:

### Features:
- **Greeting Messages**: Warm welcome from AI before starting work
- **Praise for Ideas**: AI acknowledges and appreciates your contributions
- **Value-Add Suggestions**: AI provides rare, high-value ideas after completing tasks
- **Persian Language Support**: Full Farsi messages and guidance

### Setup:

1. Copy the sample configuration:
   ```bash
   # Windsurf users
   cp .windsurf/friendly.yml friendly.yml
   
   # Or create manually
   touch friendly.yml
   ```

2. The friendly.yml in your project root will be automatically detected

3. Customize settings:
   - `enabled`: Turn on/off (true/false)
   - `interactionModel`: Use "encouraging_collaborative"
   - `language`: "fa" for Persian, "en" for English
   - `rarityLevel`: "low", "medium", or "high" for suggestion quality

### Example Interaction:

**Without Friendly Mode:**
```
USER: Create a React component
AI: [code output]
```

**With Friendly Mode:**
```
USER: Create a React component
(+ AI receives greeting: "خوشحالم که در این قسمت باهم همکاری داریم...")

AI: ایده بسیار جالبی بود! بر اساس پیشنهاد هوشمندانه شما:
[code output]

💡 ایده اضافی: برای بهینه‌سازی بیشتر، می‌توانیم از React.memo 
استفاده کنیم تا از رندرهای غیرضروری جلوگیری شود...
```

This creates a more positive and productive collaboration experience!

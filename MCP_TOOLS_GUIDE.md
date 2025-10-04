# SentinelTM MCP Tools Guide

## Tool Naming Convention

All tools are prefixed with `mcp0_` by the MCP client (Windsurf/Cursor).

## Available Tools

### 📁 File Operations

```javascript
// Read file
mcp0_file_read({ path: 'src/app.ts' });

// Write file
mcp0_file_write({ path: 'src/new.ts', content: '...' });

// Delete file
mcp0_file_delete({ path: 'temp.txt', force: true });

// Create directories
mcp0_file_mkdir({ paths: ['src/utils', 'src/models'] });

// Advanced file operations
mcp0_sentinel_fs({
  action: 'list',
  payload: { pattern: 'src/**/*.ts' },
});
```

### 📋 Task Management

```javascript
// Create task
mcp0_task_create({
  title: 'Fix bug',
  priority: 'high',
  tags: ['bug', 'urgent'],
});

// List tasks
mcp0_task_list({ status: 'open', limit: 10 });

// Get next task
mcp0_task_next();

// Expand task details
mcp0_task_expand({ id: 5 });

// Advanced task operations
mcp0_sentinel_task({
  action: 'createSubtask',
  payload: { taskId: 3, title: '...' },
});
```

### 🔍 Code Indexing

```javascript
// Build index (REQUIRED: specify root)
mcp0_index_build({ root: 'src' });

// Search files
mcp0_index_query({
  kind: 'search',
  query: 'MyClass',
});

// Search symbols
mcp0_index_query({
  kind: 'symbols',
  name: 'MyFunction',
});

// Get document
mcp0_index_query({
  kind: 'document',
  filePath: 'src/app.ts',
});

// Advanced indexing
mcp0_sentinel_index({
  action: 'refresh',
  payload: { root: 'src' },
});
```

### 🖥️ Shell Commands

```javascript
// Execute command
mcp0_shell_execute({ command: 'npm test' });

// Detect shells
mcp0_shell_detect();

// List allowed commands
mcp0_shell_list();

// Advanced shell operations
mcp0_sentinel_shell({
  action: 'executeMany',
  payload: { commands: ['npm install', 'npm test'] },
});
```

### ✅ Quality Gates

```javascript
// Run quality gate (30s timeout)
mcp0_gate_run({ minScore: 80 });

// Get gate status
mcp0_gate_status();

// Advanced gate operations
mcp0_sentinel_gate({
  action: 'run',
  payload: { minScore: 95 },
});
```

### 🤖 AI Provider

```javascript
mcp0_sentinel_provider({
  action: 'detect',
});
```

### 🔒 Security Management

```javascript
// Validate path
mcp0_sentinel_security({
  action: 'validatePath',
  payload: { path: 'src/app.ts' },
});

// Add to whitelist
mcp0_sentinel_security({
  action: 'addWhitelist',
  payload: { path: 'src/**' },
});

// Add to blacklist
mcp0_sentinel_security({
  action: 'addBlacklist',
  payload: { path: 'node_modules', reason: 'Dependencies' },
});

// Get lists
mcp0_sentinel_security({ action: 'getWhitelist' });
mcp0_sentinel_security({ action: 'getBlacklist' });
```

### 📊 Dashboard & Monitoring

```javascript
// Get project metrics
mcp0_sentinel_dashboard({ action: 'getMetrics' });
// Returns: files, tasks, quality, system stats

// Generate report
mcp0_sentinel_dashboard({ action: 'generateReport' });
// Returns: Markdown formatted report
```

### 🔄 CI/CD Integration

```javascript
// Generate GitHub Actions
mcp0_sentinel_cicd({
  action: 'generateWorkflow',
  payload: { provider: 'github', projectName: 'my-project' },
});

// Generate GitLab CI
mcp0_sentinel_cicd({
  action: 'generateWorkflow',
  payload: { provider: 'gitlab', projectName: 'my-project' },
});

// Run pipeline locally
mcp0_sentinel_cicd({
  action: 'runPipeline',
  payload: {
    config: {
      provider: 'custom',
      stages: [
        { name: 'test', commands: ['npm test'] },
        { name: 'build', commands: ['npm run build'] },
      ],
    },
  },
});

// Run quality gate
mcp0_sentinel_cicd({ action: 'runQualityGate' });

// Get history
mcp0_sentinel_cicd({ action: 'getHistory', payload: { count: 10 } });
```

### 🔍 Advanced Indexing

```javascript
// Index with filters
mcp0_sentinel_index({
  action: 'advanced',
  payload: {
    root: 'src',
    exclude: ['*.test.ts', '*.spec.ts'],
    include: ['*.ts', '*.js'],
    maxFileSize: 1048576,
    externalProjects: ['../shared-lib'],
  },
});

// Advanced search
mcp0_sentinel_index({
  action: 'searchAdvanced',
  payload: {
    query: 'createTask',
    filters: {
      fileTypes: ['.ts', '.js'],
      excludePaths: ['node_modules'],
      maxResults: 100,
    },
  },
});
```

## Important Notes

### Paths

- ✅ Use relative paths: `"src/app.ts"`
- ❌ Don't use absolute: `"d:\\project\\src\\app.ts"`

### Indexing

- ✅ Always specify root: `{ root: "src" }`
- ❌ Missing root causes EBUSY errors

### Timeouts

- Gate operations: 30s
- Subtask updates: 15s
- Shell commands: 120s

### Workspace

All operations execute in: `d:\Work Directory\channel`
(Set via `SENTINEL_WORKSPACE` env variable)

## Troubleshooting

**"Step was canceled"**
→ Restart IDE or MCP server

**"Path must stay within workspace"**
→ Use relative paths only

**"EBUSY" error**
→ Add `root` parameter to index_build

**Timeout errors**
→ Use CLI for long operations: `node dist/cli.js gate run`

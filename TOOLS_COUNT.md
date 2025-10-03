# SentinelTM MCP Tools Count

## Total Tools: 27

### Simple Tools (14)
1. `task_create` - Quick task creation
2. `task_list` - List tasks with filters
3. `task_next` - Get next priority task
4. `task_expand` - Get task details + subtasks
5. `file_read` - Read file contents
6. `file_write` - Write/append to files
7. `file_delete` - Delete files/directories
8. `file_mkdir` - Create directories
9. `shell_execute` - Run commands safely
10. `shell_detect` - Detect available shells
11. `shell_list` - List allowed commands
12. `index_build` - Build project index
13. `index_query` - Query index (search/symbols/docs)
14. `gate_run` - Execute quality gates

### Complex Tools (10)
15. `sentinel_task` - Unified task management API
16. `sentinel_fs` - Advanced file operations
17. `sentinel_shell` - Advanced shell operations
18. `sentinel_index` - Advanced indexing with filters
19. `sentinel_provider` - AI provider management
20. `sentinel_gate` - Quality gate management
21. `sentinel_security` - Path security validation ✨ NEW
22. `sentinel_dashboard` - Project monitoring ✨ NEW
23. `sentinel_cicd` - CI/CD integration ✨ NEW
24. `gate_status` - Get gate configuration

### Agent Tools (3)
25. `agent_plan` - Generate structured plans with think_depth
26. `agent_execute` - Execute planned actions
27. `agent_reflect` - Reflect on execution results

## New Features Added

### 🔒 Security Management (sentinel_security)
- `validatePath` - Check path security
- `addWhitelist` - Add to whitelist
- `addBlacklist` - Add to blacklist
- `getWhitelist` - Get whitelist rules
- `getBlacklist` - Get blacklist rules

### 📊 Dashboard (sentinel_dashboard)
- `getMetrics` - Project metrics (files, tasks, quality, system)
- `generateReport` - Markdown report generation

### 🔄 CI/CD (sentinel_cicd)
- `generateWorkflow` - GitHub Actions / GitLab CI
- `runPipeline` - Local pipeline execution
- `runQualityGate` - Quality gate integration
- `getHistory` - Pipeline history

### 🔍 Advanced Indexing (sentinel_index)
- `advanced` - Index with custom filters
- `searchAdvanced` - Search with filters

## Tool Categories

| Category | Count | Tools |
|----------|-------|-------|
| Task Management | 5 | task_create, task_list, task_next, task_expand, sentinel_task |
| File Operations | 5 | file_read, file_write, file_delete, file_mkdir, sentinel_fs |
| Shell Operations | 4 | shell_execute, shell_detect, shell_list, sentinel_shell |
| Code Intelligence | 3 | index_build, index_query, sentinel_index |
| Quality & Gates | 3 | gate_run, gate_status, sentinel_gate |
| Security | 1 | sentinel_security ✨ |
| Monitoring | 1 | sentinel_dashboard ✨ |
| CI/CD | 1 | sentinel_cicd ✨ |
| AI Provider | 1 | sentinel_provider |
| Agent | 3 | agent_plan, agent_execute, agent_reflect |

## Usage Statistics

**Most Used Tools:**
1. `file_read` / `file_write` - File operations
2. `sentinel_task` - Task management
3. `shell_execute` - Command execution
4. `index_build` / `index_query` - Code search

**New Tools (v1.2.0):**
- `sentinel_security` - Path security
- `sentinel_dashboard` - Monitoring
- `sentinel_cicd` - CI/CD integration
- Enhanced `sentinel_index` - Advanced filtering

## Tool Response Format

All tools return:
```typescript
{
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  hint?: string;
  nextSteps?: string[];
}
```

---

**Last Updated:** 2024
**Version:** 1.2.0

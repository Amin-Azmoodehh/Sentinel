# SentinelTM Project Coding Standards

## Architecture Rules

- **Service Layer**: All business logic must be in `src/services/` directory
- **Command Layer**: CLI commands must be in `src/commands/` directory  
- **Provider Pattern**: Use factory pattern for AI providers in `src/providers/`
- **Configuration**: All config through `configService.load()`, no direct file access
- **Database**: Use `sqliteService` for all database operations

## TypeScript Standards

- **Strict Mode**: All files must use TypeScript strict mode
- **No Any**: Avoid `any` types, use proper interfaces and generics
- **Error Handling**: All async functions must have proper error handling
- **Imports**: Use absolute imports from `src/`, no relative imports beyond parent directory
- **Exports**: Use named exports, avoid default exports except for main entry points

## Security Requirements

- **No Hardcoded Values**: All secrets, URLs, and config in environment variables or config files
- **Input Validation**: All user input must be validated and sanitized
- **Path Security**: Use `ensureWorkspacePath()` for all file operations
- **Shell Commands**: Only allow whitelisted commands through `shellService`

## Code Quality Standards

- **Function Length**: Maximum 50 lines per function
- **File Length**: Maximum 300 lines per file (auto-split if exceeded)
- **Complexity**: Avoid deeply nested code (max 4 levels)
- **Naming**: Use descriptive names, avoid abbreviations
- **Comments**: JSDoc for all public functions, inline comments for complex logic

## Testing Requirements

- **Unit Tests**: All service functions must have unit tests
- **Integration Tests**: All CLI commands must have integration tests
- **Error Cases**: Test both success and failure scenarios
- **Mocking**: Mock external dependencies (file system, network, etc.)

## Forbidden Patterns

- **Console Output**: Use `log` service instead of `console.log`
- **Direct File Access**: Use `fsService` instead of `fs` directly
- **Synchronous Operations**: Prefer async/await over sync operations
- **Global State**: Avoid global variables, use dependency injection
- **Magic Numbers**: Use named constants for all numeric values

## Performance Guidelines

- **Lazy Loading**: Import heavy dependencies only when needed
- **Caching**: Cache expensive operations (file reads, API calls)
- **Memory Management**: Clean up resources, avoid memory leaks
- **Batch Operations**: Group multiple operations when possible

## Documentation Standards

- **README**: Keep README updated with latest features
- **API Docs**: Document all public APIs with examples
- **Change Log**: Update CHANGELOG.md for all releases
- **Code Comments**: Explain "why" not "what" in comments

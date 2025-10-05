import { Command } from 'commander';
import { runStdioServer, runHttpServer, runSseServer } from '../mcp/manager.js';
import { log } from '../utils/logger.js';

type ServeOptions = {
  transport: 'stdio' | 'http' | 'sse';
  port?: string;
};

export const registerServeCommand = (program: Command): void => {
  program
    .command('serve')
    .description('🚀 Start MCP server for AI agents')
    .option('-t, --transport <type>', 'Specify the transport type (stdio, http, sse)', 'stdio')
    .option('--mcp-stdio', 'Use stdio transport (alias for --transport stdio)')
    .option('-p, --port <port>', 'Specify the port for http/sse transports', '8008')
    .option('--workspace <path>', 'Set workspace directory (overrides SENTINEL_WORKSPACE)')
    .action(async (options: ServeOptions & { mcpStdio?: boolean; workspace?: string }) => {
      // If --workspace is provided, set it as environment variable
      if (options.workspace) {
        process.env.SENTINEL_WORKSPACE = options.workspace;
      }
      
      // If --mcp-stdio is used, override transport to stdio
      if (options.mcpStdio) {
        options.transport = 'stdio';
      }
      try {
        // This will be updated to handle different transports
        switch (options.transport) {
          case 'stdio':
            await runStdioServer();
            break;
          case 'http':
            runHttpServer(Number(options.port));
            // Keep the process alive for the HTTP server
            await new Promise(() => {});
            break;
          case 'sse':
            runSseServer(Number(options.port));
            // Keep the process alive for the SSE server
            await new Promise(() => {});
            break;
          default:
            log.error(`Transport '${options.transport}' is not yet supported.`);
            process.exit(1);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error('Failed to run SentinelTM MCP server: ' + message);
        process.exit(1);
      }
    });
};

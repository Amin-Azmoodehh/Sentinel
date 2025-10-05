import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { McpError, errorResponse } from '../types.js';
import { log } from '../../utils/logger.js'; // Import logger

import { ShellService } from '../../services/shellService.js';
import { PackageInfoLoader } from './PackageInfoLoader.js';
import { ToolRegistry } from './ToolRegistry.js';

const MCP_TIMEOUT = 300000; // 5 minutes (same as shell service)

export class SentinelMcpServer {
  private shellService: ShellService;
  private server: Server | null = null;
  private toolRegistry: ToolRegistry;
  private packageInfo: PackageInfoLoader;
  private handlerCache = new Map<string, (args: Record<string, unknown>) => Promise<unknown>>();

  constructor() {
    this.shellService = ShellService.getInstance();
    this.packageInfo = new PackageInfoLoader();
    this.toolRegistry = new ToolRegistry();
  }

  private async initialize(): Promise<void> {
    // Set workspace root from environment variable if provided
    if (process.env.SENTINEL_WORKSPACE) {
      try {
        let workspaceRoot = process.env.SENTINEL_WORKSPACE;
        
        // Handle ${workspaceFolder} variable that IDEs might not resolve
        // Windsurf/Cursor may pass this as a literal string, so we resolve it to cwd
        if (workspaceRoot.includes('${workspaceFolder}')) {
          const resolved = workspaceRoot.replace('${workspaceFolder}', process.cwd());
          log.info(`[MCP] Resolved ${workspaceRoot} to ${resolved}`);
          workspaceRoot = resolved;
        }
        
        log.info(`[MCP] Setting workspace root to: ${workspaceRoot}`);

        // IMPORTANT: Update fsService FIRST, then change directory
        const { setWorkspaceRoot } = await import('../../services/fsService.js');
        setWorkspaceRoot(workspaceRoot);

        // Change process working directory
        process.chdir(workspaceRoot);

        log.info(`[MCP] Working directory changed to: ${process.cwd()}`);
      } catch (error) {
        log.error(`[MCP] Failed to set workspace root: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      log.warn('[MCP] SENTINEL_WORKSPACE not set! File operations may fail. See MCP_SETUP.md');
      log.warn(`[MCP] Current working directory: ${process.cwd()}`);
    }
  }

  async start(): Promise<void> {
    await this.initialize();


    const transport = new StdioServerTransport();
    const { name, version } = this.packageInfo.getInfo();

    this.server = new Server(
      { name, version },
      { capabilities: { tools: { call: true, list: true }, resources: { list: true } } }
    );

    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.toolRegistry.getDefinitions(),
    }));

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const callId = Date.now().toString(36);
      log.info(`[MCP][${callId}] Received tool call: ${name}`);

      try {
        const handler = this.handlerCache.get(name) || this.toolRegistry.getHandler(name);
        if (!handler) throw new McpError('Unknown tool: ' + name, 'ERR_UNKNOWN_TOOL');

        if (!this.handlerCache.has(name)) this.handlerCache.set(name, handler);

        const result = await Promise.race([
          handler(args || {}),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new McpError(`Tool '${name}' timed out after ${MCP_TIMEOUT}ms`, 'ERR_TIMEOUT')
                ),
              MCP_TIMEOUT
            )
          ),
        ]);

        log.info(`[MCP][${callId}] Tool call '${name}' completed successfully.`);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error) {
        log.error(
          `[MCP][${callId}] Tool call '${name}' failed: ${error instanceof Error ? error.message : String(error)}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResponse(error)) }],
          isError: true,
        };
      }
    });

    await this.server.connect(transport);
    log.info('MCP Server connected and ready.');
  }

  public async handleHttpRequest(request: {
    params?: { name?: string; arguments?: any };
  }): Promise<any> {
    const { name, arguments: args } = request.params || {};
    if (!name) {
      return { error: 'Missing tool name in request' };
    }

    const callId = Date.now().toString(36);
    log.info(`[HTTP][${callId}] Received tool call: ${name}`);

    try {
      const handler = this.handlerCache.get(name) || this.toolRegistry.getHandler(name);
      if (!handler) {
        throw new McpError('Unknown tool: ' + name, 'ERR_UNKNOWN_TOOL');
      }

      const result = await Promise.race([
        handler(args || {}),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new McpError(`Tool '${name}' timed out after ${MCP_TIMEOUT}ms`, 'ERR_TIMEOUT')
              ),
            MCP_TIMEOUT
          )
        ),
      ]);

      log.info(`[HTTP][${callId}] Tool call '${name}' completed successfully.`);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (error) {
      log.error(
        `[HTTP][${callId}] Tool call '${name}' failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(errorResponse(error)) }],
        isError: true,
      };
    }
  }

  async stop(): Promise<void> {
    if (this.server) {
      await this.server.close();
      this.server = null;
      log.info('MCP Server stopped.');
    }
    this.shellService.killAllProcesses();
  }
}

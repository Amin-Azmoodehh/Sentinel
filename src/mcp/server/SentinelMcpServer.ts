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

const MCP_TIMEOUT = 15000; // 15 seconds

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

  async start(): Promise<void> {
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
            setTimeout(() => reject(new McpError(`Tool '${name}' timed out after ${MCP_TIMEOUT}ms`, 'ERR_TIMEOUT')),
              MCP_TIMEOUT
            )
          ),
        ]);

        log.info(`[MCP][${callId}] Tool call '${name}' completed successfully.`);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error) {
        log.error(`[MCP][${callId}] Tool call '${name}' failed: ${error instanceof Error ? error.message : String(error)}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResponse(error)) }],
          isError: true,
        };
      }
    });

    await this.server.connect(transport);
    log.info('MCP Server connected and ready.');
  }

  public async handleHttpRequest(request: any): Promise<any> {
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
          setTimeout(() => reject(new McpError(`Tool '${name}' timed out after ${MCP_TIMEOUT}ms`, 'ERR_TIMEOUT')),
            MCP_TIMEOUT
          )
        ),
      ]);

      log.info(`[HTTP][${callId}] Tool call '${name}' completed successfully.`);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (error) {
      log.error(`[HTTP][${callId}] Tool call '${name}' failed: ${error instanceof Error ? error.message : String(error)}`);
      return { content: [{ type: 'text', text: JSON.stringify(errorResponse(error)) }], isError: true };
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

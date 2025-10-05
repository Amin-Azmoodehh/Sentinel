import type { ExperimentalTool, ToolHandler } from '../types.js';
import { ToolHandlers } from '../toolHandlers.js';
import { ComplexHandlers } from '../complexHandlers.js';
import {
  buildTaskToolDefinition,
  buildFsToolDefinition,
  buildShellToolDefinition,
  buildIndexToolDefinition,
  buildProviderToolDefinition,
  buildGateToolDefinition,
  buildTaskCreateToolDefinition,
  buildTaskListToolDefinition,
  buildTaskExpandToolDefinition,
  buildFileReadToolDefinition,
  buildFileWriteToolDefinition,
  buildFileDeleteToolDefinition,
  buildFileMkdirToolDefinition,
  buildShellExecuteToolDefinition,
  buildShellDetectToolDefinition,
  buildShellListToolDefinition,
  buildIndexBuildToolDefinition,
  buildIndexQueryToolDefinition,
  buildGateRunToolDefinition,
  buildGateStatusToolDefinition,
  buildSecurityToolDefinition,
  buildDashboardToolDefinition,
  buildCICDToolDefinition,
} from '../toolDefinitions.js';
import {
  handleSecurityTool,
  handleDashboardTool,
  handleCICDTool,
} from '../toolHandlers/enhancedHandlers.js';

type ToolRegistration = {
  definition: ExperimentalTool;
  handler: ToolHandler;
  aliases?: string[];
};

export class ToolRegistry {
  private toolDefinitions: ExperimentalTool[] = [];
  private toolHandlers: Map<string, ToolHandler> = new Map();
  private toolAliases: Map<string, string> = new Map();

  constructor() {
    this.registerAllTools();
  }

  getDefinitions(): ExperimentalTool[] {
    return this.toolDefinitions;
  }

  getHandler(name: string): ToolHandler | undefined {
    const canonicalName = this.toolAliases.get(name) ?? name;
    return this.toolHandlers.get(canonicalName);
  }

  private registerAllTools(): void {
    const simpleHandlers = new ToolHandlers();
    const complexHandlers = new ComplexHandlers();

    // Pre-bind handlers to avoid repeated binding calls
    const boundHandlers = {
      // Complex handlers
      handleTaskTool: complexHandlers.handleTaskTool.bind(complexHandlers),
      handleFsTool: complexHandlers.handleFsTool.bind(complexHandlers),
      handleShellTool: complexHandlers.handleShellTool.bind(complexHandlers),
      handleIndexTool: complexHandlers.handleIndexTool.bind(complexHandlers),
      handleProviderTool: complexHandlers.handleProviderTool.bind(complexHandlers),
      handleGateTool: complexHandlers.handleGateTool.bind(complexHandlers),

      // Simple handlers
      handleTaskCreateTool: simpleHandlers.handleTaskCreateTool.bind(simpleHandlers),
      handleTaskListTool: simpleHandlers.handleTaskListTool.bind(simpleHandlers),
      handleTaskExpandTool: simpleHandlers.handleTaskExpandTool.bind(simpleHandlers),
      handleFileReadTool: simpleHandlers.handleFileReadTool.bind(simpleHandlers),
      handleFileWriteTool: simpleHandlers.handleFileWriteTool.bind(simpleHandlers),
      handleFileDeleteTool: simpleHandlers.handleFileDeleteTool.bind(simpleHandlers),
      handleFileMkdirTool: simpleHandlers.handleFileMkdirTool.bind(simpleHandlers),
      handleShellExecuteTool: simpleHandlers.handleShellExecuteTool.bind(simpleHandlers),
      handleShellDetectTool: simpleHandlers.handleShellDetectTool.bind(simpleHandlers),
      handleShellListTool: simpleHandlers.handleShellListTool.bind(simpleHandlers),
      handleIndexBuildTool: simpleHandlers.handleIndexBuildTool.bind(simpleHandlers),
      handleIndexQueryTool: simpleHandlers.handleIndexQueryTool.bind(simpleHandlers),
      handleGateRunTool: simpleHandlers.handleGateRunTool.bind(simpleHandlers),
      handleGateStatusTool: simpleHandlers.handleGateStatusTool.bind(simpleHandlers),
    };

    const toolConfig: ToolRegistration[] = [
      {
        definition: buildTaskToolDefinition(),
        handler: boundHandlers.handleTaskTool,
        aliases: ['sentinel.task'],
      },
      {
        definition: buildFsToolDefinition(),
        handler: boundHandlers.handleFsTool,
        aliases: ['sentinel.fs'],
      },
      {
        definition: buildShellToolDefinition(),
        handler: boundHandlers.handleShellTool,
        aliases: ['sentinel.shell'],
      },
      {
        definition: buildIndexToolDefinition(),
        handler: boundHandlers.handleIndexTool,
        aliases: ['sentinel.index'],
      },
      {
        definition: buildProviderToolDefinition(),
        handler: boundHandlers.handleProviderTool,
        aliases: ['sentinel.provider'],
      },
      {
        definition: buildGateToolDefinition(),
        handler: boundHandlers.handleGateTool,
        aliases: ['sentinel.gate'],
      },
      {
        definition: buildSecurityToolDefinition(),
        handler: handleSecurityTool,
        aliases: ['sentinel.security'],
      },
      {
        definition: buildDashboardToolDefinition(),
        handler: handleDashboardTool,
        aliases: ['sentinel.dashboard'],
      },
      {
        definition: buildCICDToolDefinition(),
        handler: handleCICDTool,
        aliases: ['sentinel.cicd'],
      },
      { definition: buildTaskCreateToolDefinition(), handler: boundHandlers.handleTaskCreateTool },
      { definition: buildTaskListToolDefinition(), handler: boundHandlers.handleTaskListTool },
      { definition: buildTaskExpandToolDefinition(), handler: boundHandlers.handleTaskExpandTool },
      { definition: buildFileReadToolDefinition(), handler: boundHandlers.handleFileReadTool },
      { definition: buildFileWriteToolDefinition(), handler: boundHandlers.handleFileWriteTool },
      { definition: buildFileDeleteToolDefinition(), handler: boundHandlers.handleFileDeleteTool },
      { definition: buildFileMkdirToolDefinition(), handler: boundHandlers.handleFileMkdirTool },
      {
        definition: buildShellExecuteToolDefinition(),
        handler: boundHandlers.handleShellExecuteTool,
      },
      {
        definition: buildShellDetectToolDefinition(),
        handler: boundHandlers.handleShellDetectTool,
      },
      { definition: buildShellListToolDefinition(), handler: boundHandlers.handleShellListTool },
      { definition: buildIndexBuildToolDefinition(), handler: boundHandlers.handleIndexBuildTool },
      { definition: buildIndexQueryToolDefinition(), handler: boundHandlers.handleIndexQueryTool },
      { definition: buildGateRunToolDefinition(), handler: boundHandlers.handleGateRunTool },
      { definition: buildGateStatusToolDefinition(), handler: boundHandlers.handleGateStatusTool },
    ];

    // Use a more efficient registration process
    for (const config of toolConfig) {
      this.registerTool(config.definition, config.handler, config.aliases);
    }
  }

  private registerTool(
    definition: ExperimentalTool,
    handler: ToolHandler,
    aliases: string[] = []
  ): void {
    this.toolDefinitions.push(definition);
    this.toolHandlers.set(definition.name, handler);
    aliases.forEach((alias) => {
      this.toolHandlers.set(alias, handler);
      this.toolAliases.set(alias, definition.name);
    });
  }

  getToolCount(): number {
    return this.toolDefinitions.length;
  }
}

declare module '@modelcontextprotocol/sdk' {
  export interface ClientOptions {
    tools: ExperimentalTool[];
    capabilities: Record<string, unknown>;
  }

  export interface ExperimentalTool {
    name: string;
    description: string;
    inputSchema: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  }

  export class Client {
    constructor(transport: unknown);
    connect(options: ClientOptions): Promise<void>;
    setRequestHandler(method: string, handler: (request: unknown) => Promise<unknown>): void;
    close(): Promise<void>;
  }

  export class StdioServerTransport {
    constructor();
  }

  // Add other exports as needed
  export {};
}

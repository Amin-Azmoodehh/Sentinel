export interface McpResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  hint?: string;
  nextSteps?: string[];
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<McpResponse>;

export class McpError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code = 'ERR_BAD_REQUEST', details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export const successResponse = <T>(
  data: T,
  hint?: string,
  nextSteps?: string[]
): McpResponse<T> => ({
  success: true,
  data,
  ...(hint && { hint }),
  ...(nextSteps && { nextSteps }),
});

export const errorResponse = (error: unknown, hint?: string, nextSteps?: string[]): McpResponse => {
  if (error instanceof McpError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        details: error.details,
      },
      ...(hint && { hint }),
      ...(nextSteps && { nextSteps }),
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  return {
    success: false,
    error: {
      message,
      code: 'ERR_INTERNAL_SERVER',
    },
    ...(hint && { hint }),
    ...(nextSteps && { nextSteps }),
  };
};

export interface ExperimentalTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

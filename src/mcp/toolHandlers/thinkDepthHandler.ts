import type { McpResponse } from '../types.js';
import { successResponse } from '../types.js';
import { ensureString, ensureNumber } from '../validation.js';
import { processThinkDepth } from '../../services/thinkDepthService.js';

export async function handleAgentPlanTool(args: Record<string, unknown>): Promise<McpResponse> {
  const task = ensureString(args.task, 'task');
  const context =
    typeof args.context === 'string' ? ensureString(args.context, 'context', true) : undefined;
  const think_depth = ensureNumber(args.think_depth, 'think_depth');

  const response = processThinkDepth({ task, context, think_depth });
  return successResponse(response);
}

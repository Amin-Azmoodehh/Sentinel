import { runGateViaCli, runGate, type CliGateResult } from '../../services/gateService.js';
import { configService } from '../../services/configService.js';
import { ensureString, ensureNumber, ensureObject } from '../validation.js';
import { McpResponse, McpError } from '../types.js';
import { successResponse } from '../utils.js';

const GATE_ACTIONS = ['run'] as const;
type GateAction = (typeof GATE_ACTIONS)[number];

export class GateHandler {
  async handleGateTool(args: Record<string, unknown>): Promise<McpResponse> {
    const action = ensureString(args.action, 'action') as GateAction;
    if (!GATE_ACTIONS.includes(action)) {
      throw new McpError('Unsupported gate action: ' + action);
    }
    const payload = args.payload ? ensureObject(args.payload, 'payload') : {};

    switch (action) {
      case 'run': {
        const minScore =
          payload.minScore !== undefined ? ensureNumber(payload.minScore, 'payload.minScore') : 95;
        if (minScore < 0 || minScore > 100) {
          throw new McpError('minScore must be between 0 and 100');
        }
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new McpError('Gate execution timeout (30s)')), 30000)
        );
        const result: CliGateResult = await Promise.race([runGateViaCli(minScore), timeoutPromise]);
        return successResponse(result);
      }
      default:
        throw new McpError('Unhandled gate action: ' + action);
    }
  }

  private async handleGateRunTool(args: Record<string, unknown>): Promise<McpResponse> {
    const minScore =
      args.minScore !== undefined ? ensureNumber(args.minScore, 'minScore') : undefined;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new McpError('Gate execution timeout (30s)')), 30000)
    );
    const cliResult = await Promise.race([runGateViaCli(minScore ?? 95), timeoutPromise]);
    if (!cliResult.success) {
      const fallback = await Promise.race([
        runGate(minScore ?? cliResult.threshold),
        timeoutPromise,
      ]);
      return successResponse({
        success: fallback.score >= fallback.threshold,
        score: fallback.score,
        threshold: fallback.threshold,
        fallback: true,
        cliFallback: cliResult,
        details: fallback,
      });
    }
    return successResponse({ ...cliResult, fallback: false });
  }

  private async handleGateStatusTool(_args: Record<string, unknown>): Promise<McpResponse> {
    const config = configService.load();
    return successResponse({
      threshold: config.thresholds?.gate ?? 95,
      defaults: config.defaults,
      security: config.security ?? {},
    });
  }
}

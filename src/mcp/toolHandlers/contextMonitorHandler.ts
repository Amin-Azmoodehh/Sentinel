import { contextMonitorService } from '../../services/contextMonitorService.js';

export interface ContextMonitorPayload {
  inputTokens?: number;
  outputTokens?: number;
  operation?: string;
}

export async function handleContextMonitor(
  action: string,
  payload: ContextMonitorPayload
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    switch (action) {
      case 'getStats': {
        const stats = contextMonitorService.getStats();
        return {
          success: true,
          data: {
            stats,
            message: `Context window: ${stats.usagePercentage}% used (${stats.currentSessionTokens.toLocaleString()}/${stats.modelContextWindow.toLocaleString()} tokens)`,
          },
        };
      }

      case 'recordUsage': {
        if (
          typeof payload.inputTokens !== 'number' ||
          typeof payload.outputTokens !== 'number'
        ) {
          return {
            success: false,
            error: 'inputTokens and outputTokens are required for recordUsage action',
          };
        }

        contextMonitorService.recordTokenUsage(
          payload.inputTokens,
          payload.outputTokens,
          payload.operation || 'ai_operation'
        );

        const stats = contextMonitorService.getStats();
        const warning = contextMonitorService.getWarningMessage();

        return {
          success: true,
          data: {
            recorded: true,
            currentStats: stats,
            warning: warning || undefined,
            message: `Recorded ${payload.inputTokens + payload.outputTokens} tokens. Total usage: ${stats.usagePercentage}%`,
          },
        };
      }

      case 'getWarning': {
        const warning = contextMonitorService.getWarningMessage();
        const stats = contextMonitorService.getStats();

        return {
          success: true,
          data: {
            hasWarning: !!warning,
            warning: warning || null,
            warningLevel: stats.warningLevel,
            usagePercentage: stats.usagePercentage,
            estimatedRemainingTurns: stats.estimatedRemainingTurns,
          },
        };
      }

      case 'getSummary': {
        const summary = contextMonitorService.getSessionSummary();
        const stats = contextMonitorService.getStats();

        return {
          success: true,
          data: {
            summary,
            stats,
          },
        };
      }

      case 'reset': {
        contextMonitorService.resetSession();
        return {
          success: true,
          data: {
            reset: true,
            message: 'Context monitoring session has been reset',
          },
        };
      }

      case 'exportStats': {
        const exportData = contextMonitorService.exportStats();
        return {
          success: true,
          data: {
            export: JSON.parse(exportData),
            message: 'Statistics exported successfully',
          },
        };
      }

      default:
        return {
          success: false,
          error: `Unknown action: ${action}. Available actions: getStats, recordUsage, getWarning, getSummary, reset, exportStats`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: `Context monitor error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

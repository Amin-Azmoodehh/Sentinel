import type { ToolHandler } from '../types.js';
import { pathSecurityService } from '../../services/pathSecurityService.js';
import { dashboardService } from '../../services/dashboardService.js';
import { cicdService } from '../../services/cicdService.js';
import { advancedIndexService } from '../../services/advancedIndexService.js';

export const handleSecurityTool: ToolHandler = async (args) => {
  const { action, payload = {} } = args as { action: string; payload: Record<string, unknown> };

  switch (action) {
    case 'validatePath': {
      const { path, paths } = payload as { path?: string; paths?: string[] };
      const targetPath = path || (paths && paths[0]);
      
      if (!targetPath) {
        return { success: false, error: { message: 'Either path or paths[0] must be provided' } };
      }
      
      const result = pathSecurityService.validatePath(targetPath);
      return { success: true, data: result };
    }

    case 'addWhitelist': {
      const { path, paths } = payload as { path?: string; paths?: string[] };
      const targetPath = path || (paths && paths[0]);
      
      if (!targetPath) {
        return { success: false, error: { message: 'Either path or paths[0] must be provided' } };
      }
      
      pathSecurityService.addWhitelist(targetPath);
      return { success: true, data: { message: `Added to whitelist: ${targetPath}` } };
    }

    case 'addBlacklist': {
      const { path, paths, reason } = payload as { path?: string; paths?: string[]; reason?: string };
      const targetPath = path || (paths && paths[0]);
      
      if (!targetPath) {
        return { success: false, error: { message: 'Either path or paths[0] must be provided' } };
      }
      
      pathSecurityService.addBlacklist(targetPath, reason);
      return { success: true, data: { message: `Added to blacklist: ${targetPath}` } };
    }

    case 'getWhitelist': {
      const rules = pathSecurityService.getWhitelist();
      return { success: true, data: rules };
    }

    case 'getBlacklist': {
      const rules = pathSecurityService.getBlacklist();
      return { success: true, data: rules };
    }

    default:
      return { success: false, error: { message: `Unknown security action: ${action}` } };
  }
};

export const handleDashboardTool: ToolHandler = async (args) => {
  const { action } = args as { action: string };

  switch (action) {
    case 'getMetrics': {
      const metrics = await dashboardService.getMetrics();
      return { success: true, data: metrics };
    }

    case 'generateReport': {
      const report = await dashboardService.generateReport();
      return { success: true, data: { report } };
    }

    default:
      return { success: false, error: { message: `Unknown dashboard action: ${action}` } };
  }
};

export const handleCICDTool: ToolHandler = async (args) => {
  const { action, payload = {} } = args as { action: string; payload: Record<string, unknown> };

  switch (action) {
    case 'generateWorkflow': {
      const { provider, projectName } = payload as { provider: string; projectName: string };
      let workflow = '';

      if (provider === 'github') {
        workflow = await cicdService.generateGitHubWorkflow(projectName);
      } else if (provider === 'gitlab') {
        workflow = await cicdService.generateGitLabCI(projectName);
      } else {
        return { success: false, error: { message: `Unknown provider: ${provider}` } };
      }

      return { success: true, data: { workflow } };
    }

    case 'runPipeline': {
      const { config } = payload as { config: unknown };
      const result = await cicdService.runPipeline(config as never);
      return { success: true, data: result };
    }

    case 'runQualityGate': {
      const result = await cicdService.runQualityGate();
      return { success: true, data: result };
    }

    case 'getHistory': {
      const { count } = payload as { count?: number };
      const results = await cicdService.getLastResults(count);
      return { success: true, data: results };
    }

    default:
      return { success: false, error: { message: `Unknown CI/CD action: ${action}` } };
  }
};

export const handleAdvancedIndexTool: ToolHandler = async (args) => {
  const { action, payload = {} } = args as { action: string; payload: Record<string, unknown> };

  switch (action) {
    case 'advanced': {
      const options = payload as {
        root?: string;
        exclude?: string[];
        include?: string[];
        maxFileSize?: number;
        externalProjects?: string[];
        followSymlinks?: boolean;
      };

      const stats = await advancedIndexService.indexWithOptions(options);
      return { success: true, data: stats };
    }

    case 'searchAdvanced': {
      const { query, filters } = payload as {
        query: string;
        filters?: {
          fileTypes?: string[];
          excludePaths?: string[];
          maxResults?: number;
        };
      };

      const results = await advancedIndexService.searchWithFilters(query, filters);
      return { success: true, data: results };
    }

    default:
      return { success: false, error: { message: `Unknown advanced index action: ${action}` } };
  }
};

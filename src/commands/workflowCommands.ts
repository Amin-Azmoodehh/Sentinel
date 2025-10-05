import { Command } from 'commander';
import { workflowService } from '../services/workflowService.js';
import { log } from '../utils/logger.js';

export const registerWorkflowCommands = (program: Command): void => {
  const workflowCommand = program
    .command('workflow')
    .alias('wf')
    .description('🏗️ High-level development workflows');

  // Analyze project command
  workflowCommand
    .command('analyze')
    .description('Analyze project structure and patterns')
    .action(async () => {
      const context = await workflowService.analyzeProject();

      log.info('📊 Project Analysis Results:');
      log.info(`Framework: ${context.framework}`);
      if (context.styleFramework) log.info(`Style Framework: ${context.styleFramework}`);
      if (context.testFramework) log.info(`Test Framework: ${context.testFramework}`);
      log.info(`Patterns Detected: ${context.patterns.length}`);

      context.patterns.forEach((pattern) => {
        log.info(
          `  - ${pattern.type}: ${pattern.imports.length} imports, ${pattern.exports.length} exports`
        );
      });
    });

  // Scaffold component command
  workflowCommand
    .command('component <name>')
    .description('Scaffold a new component with tests and stories')
    .option('--path <path>', 'Component directory path', 'src/components')
    .option('--framework <framework>', 'Framework (react|vue|angular)', 'react')
    .option('--style <style>', 'Style framework (tailwind|styled-components|css-modules)')
    .option('--no-test', 'Skip test file generation')
    .option('--no-story', 'Skip story file generation')
    .option('--props <props>', 'Component props as JSON string')
    .action(
      async (
        name: string,
        options: {
          path: string;
          framework: 'react' | 'vue' | 'angular';
          style?: 'tailwind' | 'styled-components' | 'css-modules';
          test: boolean;
          story: boolean;
          props?: string;
        }
      ) => {
        let props = [];

        if (options.props) {
          try {
            props = JSON.parse(options.props);
          } catch {
            log.error('❌ Invalid props JSON format');
            return;
          }
        }

        const success = await workflowService.scaffoldComponent({
          name,
          path: options.path,
          framework: options.framework,
          style: options.style,
          includeTest: options.test,
          includeStory: options.story,
          props,
        });

        if (!success) {
          process.exit(1);
        }
      }
    );

  // Refactor rename command
  workflowCommand
    .command('rename <oldName> <newName>')
    .description('Rename a symbol across the project')
    .option('--file <file>', 'Limit to specific file')
    .option('--scope <scope>', 'Scope (file|project)', 'project')
    .action(
      async (
        oldName: string,
        newName: string,
        options: {
          file?: string;
          scope: 'file' | 'project';
        }
      ) => {
        if (options.scope === 'file' && !options.file) {
          log.error('❌ --file option is required when scope is "file"');
          return;
        }

        const success = await workflowService.refactorRenameSymbol({
          filePath: options.file || '',
          oldName,
          newName,
          scope: options.scope,
        });

        if (!success) {
          process.exit(1);
        }
      }
    );

  // Create API endpoint command
  workflowCommand
    .command('api <name>')
    .description('Create a new API endpoint with validation and tests')
    .option('--method <method>', 'HTTP method (GET|POST|PUT|DELETE|PATCH)', 'GET')
    .option('--path <path>', 'API path', '/')
    .option('--request-type <type>', 'Request type interface name')
    .option('--response-type <type>', 'Response type interface name')
    .option('--no-validation', 'Skip validation logic')
    .option('--no-test', 'Skip test file generation')
    .action(
      async (
        name: string,
        options: {
          method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
          path: string;
          requestType?: string;
          responseType?: string;
          validation: boolean;
          test: boolean;
        }
      ) => {
        const success = await workflowService.createApiEndpoint({
          name,
          method: options.method,
          path: options.path,
          requestType: options.requestType,
          responseType: options.responseType,
          includeValidation: options.validation,
          includeTest: options.test,
        });

        if (!success) {
          process.exit(1);
        }
      }
    );

  // Batch operations command
  workflowCommand
    .command('batch')
    .description('Execute multiple workflow operations')
    .option('--config <file>', 'Batch configuration file', 'workflow-batch.json')
    .action(async (options: { config: string }) => {
      log.info(`🔄 Executing batch operations from ${options.config}`);

      try {
        const fs = await import('node:fs');
        const batchConfig = JSON.parse(fs.readFileSync(options.config, 'utf-8'));

        for (const operation of batchConfig.operations) {
          log.info(`Executing: ${operation.type} - ${operation.name}`);

          switch (operation.type) {
            case 'component':
              await workflowService.scaffoldComponent(operation.options);
              break;
            case 'api':
              await workflowService.createApiEndpoint(operation.options);
              break;
            case 'rename':
              await workflowService.refactorRenameSymbol(operation.options);
              break;
            default:
              log.warn(`Unknown operation type: ${operation.type}`);
          }
        }

        log.success('✅ Batch operations completed');
      } catch (error) {
        log.error(
          `❌ Batch execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
        process.exit(1);
      }
    });
};

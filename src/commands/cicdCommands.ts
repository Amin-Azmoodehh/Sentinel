import { Command } from 'commander';
import { cicdService } from '../services/cicdService.js';
import { log } from '../utils/logger.js';
import fs from 'node:fs';
import path from 'node:path';

export const cicdCommands = (program: Command) => {
  const cicd = program.command('cicd').description('🔄 CI/CD pipeline integration');

  cicd
    .command('init')
    .description('Initialize CI/CD configuration')
    .option('-p, --provider <provider>', 'CI/CD provider (github, gitlab)', 'github')
    .option('-n, --name <name>', 'Project name', 'sentinel-project')
    .action(async (options) => {
      let workflow = '';

      if (options.provider === 'github') {
        workflow = await cicdService.generateGitHubWorkflow(options.name);
        const workflowDir = path.join(process.cwd(), '.github', 'workflows');
        fs.mkdirSync(workflowDir, { recursive: true });
        const workflowPath = path.join(workflowDir, 'sentinel.yml');
        fs.writeFileSync(workflowPath, workflow);
        log.success(`GitHub workflow created: ${workflowPath}`);
      } else if (options.provider === 'gitlab') {
        workflow = await cicdService.generateGitLabCI(options.name);
        const ciPath = path.join(process.cwd(), '.gitlab-ci.yml');
        fs.writeFileSync(ciPath, workflow);
        log.success(`GitLab CI created: ${ciPath}`);
      } else {
        log.error(`Unknown provider: ${options.provider}`);
      }
    });

  cicd
    .command('run')
    .description('Run CI/CD pipeline locally')
    .option('-c, --config <file>', 'Pipeline config file')
    .action(async (options) => {
      const configPath = options.config || path.join(process.cwd(), '.sentineltm', 'cicd.json');

      if (!fs.existsSync(configPath)) {
        log.error(`Config not found: ${configPath}`);
        return;
      }

      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      log.info('Running CI/CD pipeline...');

      const result = await cicdService.runPipeline(config);

      console.log('\n📦 Pipeline Results\n');
      result.stages.forEach((stage) => {
        const status = stage.success ? '✅' : '❌';
        console.log(`${status} ${stage.name} (${stage.duration}ms)`);
      });

      console.log(`\nTotal: ${result.duration}ms`);
      console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    });

  cicd
    .command('gate')
    .description('Run quality gate')
    .action(async () => {
      log.info('Running quality gate...');
      const result = await cicdService.runQualityGate();

      if (result.passed) {
        log.success(`Quality gate passed: ${result.score}`);
      } else {
        log.error(`Quality gate failed: ${result.score}`);
        process.exit(1);
      }
    });

  cicd
    .command('history')
    .description('Show CI/CD history')
    .option('-n, --count <count>', 'Number of results', '10')
    .action(async (options) => {
      const results = await cicdService.getLastResults(parseInt(options.count));

      if (results.length === 0) {
        log.info('No CI/CD history found');
        return;
      }

      console.log('\n📜 CI/CD History\n');
      results.forEach((r, i) => {
        const status = r.success ? '✅' : '❌';
        const date = new Date(r.timestamp).toLocaleString();
        console.log(`${i + 1}. ${status} ${date} (${r.duration}ms)`);
      });
    });
};

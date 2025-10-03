#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { log } from './utils/logger.js';

const printBanner = () => {
  const logo = `
   ███████╗███████╗███╗   ██╗████████╗██╗███╗   ██╗███████╗██╗     
   ██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║████╗  ██║██╔════╝██║     
   ███████╗█████╗  ██╔██╗ ██║   ██║██╔██╗ ██║█████╗  ██║     
   ╚════██║██╔══╝  ██║╚██╗██║   ██║██║╚██╗██║██╔══╝  ██║     
   ███████║███████╗██║ ╚████║   ██║   ██║██║ ╚████║███████╗███████╗
   ╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝
                                                                
                  ${chalk.yellow('🤖')} AI Agent Orchestrator ${chalk.yellow('🤖')}
  `;
  log.raw(chalk.cyan(logo));
  log.raw(chalk.green('🚀 SentinelTM Ready • Local-First • Secure'));
  log.raw('');
};

// Check if help is being requested
const args = process.argv;
const hasHelp = args.includes('--help') || args.includes('-h');
const isServeCommand = args.includes('serve');
const hasJsonFlag = args.includes('--json');

if (isServeCommand && !process.env.ST_FORCE_STDERR) {
  process.env.ST_FORCE_STDERR = '1';
  process.env.ST_SUPPRESS_FOOTER = '1';
}

if (hasJsonFlag) {
  process.env.ST_SUPPRESS_FOOTER = '1';
}

if (hasHelp && !hasJsonFlag) {
  printBanner();
}

import fs from 'node:fs';
import path from 'node:path';
import { registerProviderCommands } from './commands/providerCommands.js';
import { registerIndexCommands } from './commands/indexCommands.js';
import { registerTaskCommands } from './commands/taskCommands.js';
import { registerFsCommands } from './commands/fsCommands.js';
import { registerShellCommands } from './commands/shellCommands.js';
import { registerIdeCommands } from './commands/ideCommands.js';
import { registerConfigCommands } from './commands/configCommands.js';
import { registerGateCommands } from './commands/gateCommands.js';
import { registerServeCommand } from './commands/serveCommand.js';
import { registerResearchCommand } from './commands/researchCommands.js';
import { registerStatusCommands } from './commands/statusCommands.js';
import { registerOrchestratorCommands } from './commands/orchestratorCommands.js';
import { registerAgentCommands } from './commands/agentCommands.js';
import { securityCommands } from './commands/securityCommands.js';
import { dashboardCommands } from './commands/dashboardCommands.js';
import { cicdCommands } from './commands/cicdCommands.js';
import { advancedIndexCommands } from './commands/advancedIndexCommands.js';
import { paths } from './constants/paths.js';

const program = new Command();

const getVersion = () => {
  try {
    const pkgPath = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      '..',
      'package.json'
    );
    return JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).version;
  } catch {
    return '1.2.0';
  }
};
const version = getVersion();

paths.ensureDir(paths.sentinelRoot());

program
  .name('st')
  .description('🤖 SentinelTM - Local-First AI Agent Orchestrator')
  .version(version, '-v, --version', 'Show version number');

// Add custom help output with beautification
program.configureHelp({
  formatHelp: (cmd, helper) => {
    if (!hasHelp) {
      printBanner();
    }

    const width = helper.padWidth(cmd, helper);
    const columns = process.stdout.columns || 80;

    let output = '';

    // Custom header with box
    output += '\n';
    output += chalk.bgCyan.black.bold('  🤖 SENTINELTM CLI - AI AGENT ORCHESTRATOR  ') + '\n';
    output += chalk.cyan('┌' + '─'.repeat(columns - 2) + '┐') + '\n';

    // Description
    if (cmd.description()) {
      const descText = cmd.description();
      const maxDescLength = Math.max(1, columns - 4);
      const truncatedDesc =
        descText.length > maxDescLength ? descText.substring(0, maxDescLength) : descText;
      const padding = Math.max(0, columns - truncatedDesc.length - 3);
      output +=
        chalk.cyan('│ ') +
        chalk.white.bold(truncatedDesc) +
        chalk.cyan(' '.repeat(padding)) +
        chalk.cyan('│') +
        '\n';
    }

    output +=
      chalk.cyan('├' + '─'.repeat(width + 5) + '┬' + '─'.repeat(columns - width - 8) + '┤') + '\n';

    // Usage
    const usage = helper.commandUsage(cmd);
    const maxUsageLength = Math.max(1, columns - 16);
    const truncatedUsage =
      usage.length > maxUsageLength ? usage.substring(0, maxUsageLength) : usage;
    const usagePadding = Math.max(0, columns - width - 15 - truncatedUsage.length);
    output +=
      chalk.cyan('│ ') +
      chalk.yellow.bold('USAGE') +
      chalk.cyan(' '.repeat(Math.max(0, width - 4))) +
      chalk.cyan(' │ ') +
      chalk.white(truncatedUsage) +
      chalk.cyan(' '.repeat(usagePadding)) +
      chalk.cyan('│') +
      '\n';

    // Commands section
    const visibleCommands = helper.visibleCommands(cmd);
    if (visibleCommands.length > 0) {
      output +=
        chalk.cyan('├' + '─'.repeat(width + 5) + '┼' + '─'.repeat(columns - width - 8) + '┤') +
        '\n';
      output +=
        chalk.cyan('│ ') +
        chalk.yellow.bold('COMMANDS') +
        chalk.cyan(' '.repeat(Math.max(0, width - 5))) +
        chalk.cyan(' │') +
        '\n';

      visibleCommands.forEach((cmd) => {
        const term = helper.subcommandTerm(cmd);
        const desc = helper.subcommandDescription(cmd);
        const cmdText = chalk.green(term) + ' ' + chalk.gray(desc);
        const plainText = term + ' ' + desc;
        const padding = Math.max(0, columns - plainText.length - 4);
        output += chalk.cyan('│ ') + '  ' + cmdText + ' '.repeat(padding) + chalk.cyan('│') + '\n';
      });
    }

    // Options section
    const visibleOptions = helper.visibleOptions(cmd);
    if (visibleOptions.length > 0) {
      output +=
        chalk.cyan('├' + '─'.repeat(width + 5) + '┼' + '─'.repeat(columns - width - 8) + '┤') +
        '\n';
      output +=
        chalk.cyan('│ ') +
        chalk.yellow.bold('OPTIONS') +
        chalk.cyan(' '.repeat(Math.max(0, width - 4))) +
        chalk.cyan(' │') +
        '\n';

      visibleOptions.forEach((option) => {
        const term = helper.optionTerm(option);
        const desc = helper.optionDescription(option);
        const optionText = chalk.magenta(term) + ' ' + chalk.gray(desc);
        const plainText = term + ' ' + desc;
        const padding = Math.max(0, columns - plainText.length - 4);
        output +=
          chalk.cyan('│ ') + '  ' + optionText + ' '.repeat(padding) + chalk.cyan('│') + '\n';
      });
    }

    output +=
      chalk.cyan('└' + '─'.repeat(width + 5) + '┴' + '─'.repeat(columns - width - 8) + '┘') + '\n';

    // Footer
    output +=
      '\n' +
      chalk.cyan('💡 Quick Start: ') +
      chalk.white('st provider detect') +
      chalk.gray(' → ') +
      chalk.white('st set provider <name>') +
      chalk.gray(' → ') +
      chalk.white('st serve') +
      '\n';
    output +=
      chalk.cyan('📚 Docs: ') + chalk.white('https://github.com/Amin-Azmoodehh/Sentinel') + '\n';

    return output;
  },
});

registerProviderCommands(program);
registerIndexCommands(program);
registerTaskCommands(program);
registerFsCommands(program);
registerShellCommands(program);
registerIdeCommands(program);
registerConfigCommands(program);
registerGateCommands(program);
registerServeCommand(program);
registerResearchCommand(program);
registerStatusCommands(program);
registerOrchestratorCommands(program);
registerAgentCommands(program);
securityCommands(program);
dashboardCommands(program);
cicdCommands(program);
advancedIndexCommands(program);

program.parse(process.argv);

// Print footer after normal execution (not for help or json)
if (!hasHelp && !hasJsonFlag && process.env.ST_SUPPRESS_FOOTER !== '1') {
  const footer = chalk.cyan('────────────── SentinelTM ──────────────');
  log.raw(footer);
}

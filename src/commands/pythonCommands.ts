import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { log } from '../utils/logger.js';
import { ShellService } from '../services/shellService.js';

const PYPROJECT_BODY = `# SentinelTM - Ruff config (formatter + linter + import sort)
[tool.ruff]
target-version = "py311"
line-length = 100
select = ["E", "F", "I"]

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
`;

const PRE_COMMIT_BODY = `repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.6.9
    hooks:
      - id: ruff
      - id: ruff-format
`;

export const registerPythonCommands = (program: Command): void => {
  const py = program.command('py').description('🐍 Python helpers (Ruff formatter/linter)');
  const shell = ShellService.getInstance();

  py
    .command('init-config')
    .description('Create minimal Ruff config (pyproject.toml). Optionally add pre-commit hook.')
    .option('--pre-commit', 'Also create .pre-commit-config.yaml', false)
    .action((options: { preCommit?: boolean }) => {
      const root = process.cwd();
      const pyprojectPath = path.join(root, 'pyproject.toml');
      if (!fs.existsSync(pyprojectPath)) {
        fs.writeFileSync(pyprojectPath, PYPROJECT_BODY);
        log.success('Created pyproject.toml (Ruff config)');
      } else {
        log.info('pyproject.toml already exists. Skipping.');
      }

      if (options.preCommit) {
        const preCommitPath = path.join(root, '.pre-commit-config.yaml');
        if (!fs.existsSync(preCommitPath)) {
          fs.writeFileSync(preCommitPath, PRE_COMMIT_BODY);
          log.success('Created .pre-commit-config.yaml');
          log.info('Tip: pipx install pre-commit && pre-commit install');
        } else {
          log.info('.pre-commit-config.yaml already exists. Skipping.');
        }
      }
    });

  const ensureRuff = async (): Promise<boolean> => {
    const whichCmd = process.platform === 'win32' ? 'where ruff' : 'which ruff';
    const check = await shell.executeCommand(whichCmd, { shell: undefined });
    if (!check.success) {
      log.warn('Ruff not found. Install via:');
      if (process.platform === 'win32') {
        log.raw('  pipx install ruff  (recommended)');
        log.raw('  # or inside venv: python -m venv .venv && .\\.venv\\Scripts\\pip install ruff');
      } else {
        log.raw('  pipx install ruff  (recommended)');
        log.raw('  # or: python -m venv .venv && . .venv/bin/activate && pip install ruff');
      }
      return false;
    }
    return true;
  };

  py
    .command('format')
    .description('Run: ruff format .')
    .action(async () => {
      if (!(await ensureRuff())) return;
      const result = await shell.executeCommand('ruff format .', { shell: undefined });
      if (result.stdout) log.raw(result.stdout);
      if (result.stderr) log.error(result.stderr);
      if (!result.success) process.exit(result.exitCode ?? 1);
    });

  py
    .command('lint')
    .description('Run: ruff check . --fix')
    .action(async () => {
      if (!(await ensureRuff())) return;
      const result = await shell.executeCommand('ruff check . --fix', { shell: undefined });
      if (result.stdout) log.raw(result.stdout);
      if (result.stderr) log.error(result.stderr);
      if (!result.success) process.exit(result.exitCode ?? 1);
    });
};

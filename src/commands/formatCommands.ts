import { Command } from 'commander';
import fg from 'fast-glob';
import fs from 'node:fs';
import path from 'node:path';
import { ShellService } from '../services/shellService.js';
import { log } from '../utils/logger.js';

// Minimal, auto-detecting format/lint runner across common languages
// Tools used if available:
// - JS/TS: prettier (format), eslint --fix (lint)
// - Python: ruff format, ruff check --fix
// - Go: gofmt -w, golangci-lint run --fix (if available) or go vet
// - Rust: rustfmt, cargo clippy -Z unstable-options --fix (best-effort)
// - Shell: shfmt -w, shellcheck
// - Markdown/YAML/JSON: prettier

const hasAny = (patterns: string[]): boolean => fg.sync(patterns, { dot: true }).length > 0;

const ensureTool = async (tool: string, shell: ShellService): Promise<boolean> => {
  const whichCmd = process.platform === 'win32' ? `where ${tool}` : `which ${tool}`;
  const res = await shell.executeCommand(whichCmd, { shell: undefined });
  return !!res.success;
};

const run = async (cmd: string, shell: ShellService) => {
  const res = await shell.executeCommand(cmd, { shell: undefined });
  if (res.stdout) log.raw(res.stdout);
  if (res.stderr) log.error(res.stderr);
  if (!res.success) process.exit(res.exitCode ?? 1);
};

export const registerFormatCommands = (program: Command): void => {
  const shell = ShellService.getInstance();

  const fmt = program.command('fmt').description('🧹 Format code across languages');
  const lint = program.command('lint').description('🔍 Lint code across languages');
  const init = program.command('init-config').description('⚙️ Create minimal formatter/linter configs');

  // st fmt [lang]
  fmt
    .argument('[lang]', 'language: js|ts|py|go|rs|sh|md|yaml|json|all', 'all')
    .action(async (lang: string) => {
      const tasks: Array<Promise<void>> = [];

      const doJs = async () => {
        if (!(await ensureTool('prettier', shell))) return log.warn('prettier not found');
        await run('prettier --write "**/*.{js,jsx,ts,tsx,json,md,yml,yaml}"', shell);
      };

      const doEslintFix = async () => {
        if (!(await ensureTool('eslint', shell))) return; // optional
        await run('eslint --fix "src/**/*.{ts,tsx,js,jsx}"', shell);
      };

      const doPy = async () => {
        if (!(await ensureTool('ruff', shell))) return log.warn('ruff not found');
        await run('ruff format .', shell);
      };

      const doGo = async () => {
        if (!(await ensureTool('gofmt', shell))) return log.warn('gofmt not found');
        await run('gofmt -w .', shell);
      };

      const doRust = async () => {
        if (!(await ensureTool('rustfmt', shell))) return log.warn('rustfmt not found');
        await run('rustfmt +nightly . 2> NUL || rustfmt .', shell);
      };

      const doShell = async () => {
        if (!(await ensureTool('shfmt', shell))) return log.warn('shfmt not found');
        await run('shfmt -w .', shell);
      };

      const all = lang === 'all';
      if (all || ['js', 'ts', 'md', 'yaml', 'json'].includes(lang)) tasks.push(doJs(), doEslintFix());
      if (all || lang === 'py') tasks.push(doPy());
      if (all || lang === 'go') tasks.push(doGo());
      if (all || lang === 'rs') tasks.push(doRust());
      if (all || lang === 'sh') tasks.push(doShell());

      if (tasks.length === 0) {
        log.warn('No matching language or tools detected.');
        return;
      }
      await Promise.all(tasks);
    });

  // st lint [lang]
  lint
    .argument('[lang]', 'language: js|ts|py|go|rs|sh|md|yaml|json|all', 'all')
    .action(async (lang: string) => {
      const tasks: Array<Promise<void>> = [];

      const js = async () => {
        if (!(await ensureTool('eslint', shell))) return log.warn('eslint not found');
        await run('eslint "src/**/*.{ts,tsx,js,jsx}"', shell);
      };
      const py = async () => {
        if (!(await ensureTool('ruff', shell))) return log.warn('ruff not found');
        await run('ruff check .', shell);
      };
      const sh = async () => {
        if (!(await ensureTool('shellcheck', shell))) return log.warn('shellcheck not found');
        await run('shellcheck $(git ls-files "**/*.sh")', shell);
      };

      const all = lang === 'all';
      if (all || ['js', 'ts'].includes(lang)) tasks.push(js());
      if (all || lang === 'py') tasks.push(py());
      if (all || lang === 'sh') tasks.push(sh());

      if (tasks.length === 0) {
        log.warn('No matching language or tools detected.');
        return;
      }
      await Promise.all(tasks);
    });

  // st init-config [lang]
  init
    .argument('[lang]', 'language: js|ts|py|sh|all', 'all')
    .action(async (lang: string) => {
      const root = process.cwd();

      const writeFile = (rel: string, content: string) => {
        const p = path.join(root, rel);
        if (!fs.existsSync(path.dirname(p))) fs.mkdirSync(path.dirname(p), { recursive: true });
        if (!fs.existsSync(p)) {
          fs.writeFileSync(p, content);
          log.success('Created ' + rel);
        } else {
          log.info(rel + ' already exists. Skipping.');
        }
      };

      const doJs = () => {
        writeFile(
          '.eslintrc.json',
          '{"env":{"es2021":true,"node":true},"extends":["eslint:recommended"],"parserOptions":{"ecmaVersion":12},"rules":{"no-unused-vars":0,"semi":[2,"always"],"quotes":[2,"single"]}}'
        );
        writeFile('.prettierrc', '{"singleQuote": true, "semi": true}');
      };

      const doPy = () => {
        writeFile(
          'pyproject.toml',
          '# SentinelTM - Ruff config\n[tool.ruff]\ntarget-version = "py311"\nline-length = 100\nselect = ["E", "F", "I"]\n\n[tool.ruff.format]\nquote-style = "double"\nindent-style = "space"\n'
        );
      };

      const doSh = () => {
        // shellcheck/shfmt معمولاً نیاز به فایل کانفیگ ندارند
        writeFile('.editorconfig', 'root = true\n\n[*]\nend_of_line = lf\ninsert_final_newline = true\n');
      };

      const all = lang === 'all';
      if (all || ['js', 'ts'].includes(lang)) doJs();
      if (all || lang === 'py') doPy();
      if (all || lang === 'sh') doSh();
    });
};

import path from 'node:path';
import fs from 'node:fs';
import { writeJsonFile } from '../utils/fileSystem.js';
import { log } from '../utils/logger.js';
import { copyFolderRecursive, ensureDir, createMcpConfig, ensureMcpConfig } from './ideConfig.js';

export const applyIdeProfile = (
  profileName: string,
  targetDir: string,
  providerName: string,
  applyRules: boolean,
  workspacePath: string
): void => {
  ensureDir(targetDir);
  const mcpTargetPath = path.join(targetDir, 'mcp.json');
  writeJsonFile(mcpTargetPath, createMcpConfig(providerName, workspacePath));
  ensureMcpConfig(mcpTargetPath, workspacePath);

  // Copy or create rules.json
  const projectRulesPath = path.join(process.cwd(), 'rules.example.json');
  const fallbackRulesPath = path.join(process.cwd(), '.sentineltm', 'config', 'rules.json');
  const targetRulesPath = path.join(targetDir, 'rules.json');

  let sourceRulesPath = projectRulesPath;
  if (!fs.existsSync(projectRulesPath) && fs.existsSync(fallbackRulesPath)) {
    sourceRulesPath = fallbackRulesPath;
  }

  if (fs.existsSync(sourceRulesPath)) {
    try {
      fs.copyFileSync(sourceRulesPath, targetRulesPath);
      log.success(`  ✅ Copied rules.json to ${profileName}`);
    } catch (error) {
      log.warn(`  ⚠️ Could not copy rules.json: ${(error as Error).message}`);
    }
  } else {
    try {
      writeJsonFile(targetRulesPath, createDefaultRules());
      log.success(`  ✅ Created default rules.json in ${profileName}`);
    } catch (error) {
      log.warn(`  ⚠️ Could not create rules.json: ${(error as Error).message}`);
    }
  }

  if (applyRules) {
    const sentinelDir = path.join(process.cwd(), '.sentineltm');
    const profilesDir = path.join(sentinelDir, 'profiles', profileName);

    ensureDir(sentinelDir);
    ensureDir(profilesDir);

    const profileRulesPath = path.join(profilesDir, 'rules.json');
    try {
      if (fs.existsSync(sourceRulesPath)) {
        fs.copyFileSync(sourceRulesPath, profileRulesPath);
      } else {
        writeJsonFile(profileRulesPath, createDefaultRules());
      }
      log.success(`  ✅ Copied rules to profile: ${profileName}`);
    } catch (error) {
      log.warn(`  ⚠️ Could not copy to profile: ${(error as Error).message}`);
    }

    const sourceRulesFolder = path.join(process.cwd(), '.windsurf', 'rules');
    const targetRulesFolder = path.join(targetDir, 'rules');

    if (fs.existsSync(sourceRulesFolder)) {
      try {
        copyFolderRecursive(sourceRulesFolder, targetRulesFolder);
        log.success(`  📁 Copied rules folder to ${profileName}`);
      } catch (error) {
        log.warn(`  ⚠️ Could not copy rules folder: ${(error as Error).message}`);
      }
    }
  }
};

export const applyVsCode = (providerName: string, applyRules: boolean, workspacePath: string): void => {
  const root = process.cwd();
  const vscodeDir = path.join(root, '.vscode');
  ensureDir(vscodeDir);
  writeJsonFile(path.join(vscodeDir, 'settings.json'), {
    'sentinel.tm.enabled': true,
    'sentinel.tm.provider': providerName,
  });
  writeJsonFile(path.join(vscodeDir, 'tasks.json'), {
    version: '2.0.0',
    tasks: [
      { label: 'Sentinel Gate', type: 'shell', command: 'st gate run', group: 'build' },
    ],
  });
  writeJsonFile(path.join(vscodeDir, 'extensions.json'), {
    recommendations: ['ms-vscode.vscode-typescript-next'],
  });
  applyIdeProfile('VS Code', vscodeDir, providerName, applyRules, workspacePath);
};

export const applyCursor = (providerName: string, applyRules: boolean, workspacePath: string): void => {
  const root = process.cwd();
  const cursorDir = path.join(root, '.cursor');
  applyIdeProfile('Cursor', cursorDir, providerName, applyRules, workspacePath);
};

export const applyZed = (providerName: string, applyRules: boolean, workspacePath: string): void => {
  const root = process.cwd();
  const zedDir = path.join(root, '.zed');
  ensureDir(zedDir);
  // Zed uses another config too; kept minimal for now
  applyIdeProfile('Zed', zedDir, providerName, applyRules, workspacePath);
};

export const applyWindsurf = (providerName: string, applyRules: boolean, workspacePath: string): void => {
  const root = process.cwd();
  const windsurfDir = path.join(root, '.windsurf');
  applyIdeProfile('Windsurf', windsurfDir, providerName, applyRules, workspacePath);
};

export const applyProfile = (name: string, providerName: string, applyRules: boolean, workspacePath: string): void => {
  const root = process.cwd();
  const targetDir = path.join(root, `.${name.toLowerCase()}`);
  applyIdeProfile(name, targetDir, providerName, applyRules, workspacePath);
};

// Minimal default rules to avoid import cycles; mirror previous structure
const createDefaultRules = () => ({
  version: '1.6.3',
  contract: { version: '3.0', name: 'Zero Tolerance', enforcement: 'MANDATORY', binding: 'ABSOLUTE', violations: 'AUTOMATIC_REJECTION' },
  entrypoint: { filename: 'main.py', maxLines: 4, mustImportOnly: true, noLogic: true, noSideEffects: true },
  style: { maxLineLength: 79, pep8Compliant: true, noSideEffectsOnImport: true, absoluteImportsOnly: true, noRelativeImports: true, noWildcardImports: true },
  typing: { typeHintsRequired: true, typeHintsCoverage: 100, enforceEverywhere: true },
  forbidden: { functions: ['print(', 'console.log('], modules: ['subprocess', 'os.system'], hardcodedStrings: true, hardcodedNumbers: true, hardcodedUrls: true, hardcodedRegex: true },
  i18n: { logsLanguage: 'en', uiLanguage: 'fa', enforceLogLanguage: true, enforceUiLanguage: true },
});

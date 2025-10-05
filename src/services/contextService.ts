import fs from 'node:fs';
import path from 'node:path';
import { indexingService } from './indexingService.js';
import { log } from '../utils/logger.js';

export interface CodeContext {
  projectRules: string;
  relevantFiles: Array<{
    path: string;
    content: string;
    type: 'component' | 'service' | 'utility' | 'type' | 'config';
  }>;
  patterns: Array<{
    type: string;
    example: string;
    usage: string;
  }>;
  dependencies: Array<{
    name: string;
    version: string;
    usage: string[];
  }>;
  conventions: {
    naming: string[];
    structure: string[];
    imports: string[];
  };
}

export interface ContextQuery {
  intent: string; // What the agent wants to do
  keywords: string[]; // Relevant keywords to search for
  fileTypes?: string[]; // Specific file types to focus on
  maxFiles?: number; // Limit number of files to include
}

export class ContextService {
  private static instance: ContextService;
  private projectRulesCache: string | null = null;
  private patternsCache: Map<string, any> = new Map();

  static getInstance(): ContextService {
    if (!ContextService.instance) {
      ContextService.instance = new ContextService();
    }
    return ContextService.instance;
  }

  async enrichContext(query: ContextQuery): Promise<CodeContext> {
    log.info(`🧠 Enriching context for: ${query.intent}`);

    const context: CodeContext = {
      projectRules: await this.getProjectRules(),
      relevantFiles: await this.findRelevantFiles(query),
      patterns: await this.extractPatterns(query),
      dependencies: await this.analyzeDependencies(),
      conventions: await this.extractConventions(),
    };

    log.success(
      `✅ Context enriched: ${context.relevantFiles.length} files, ${context.patterns.length} patterns`
    );
    return context;
  }

  private async getProjectRules(): Promise<string> {
    if (this.projectRulesCache) {
      return this.projectRulesCache;
    }

    const rulesPath = path.join(process.cwd(), 'project_rules.md');
    if (fs.existsSync(rulesPath)) {
      this.projectRulesCache = fs.readFileSync(rulesPath, 'utf-8');
    } else {
      this.projectRulesCache = 'No specific project rules defined.';
    }

    return this.projectRulesCache;
  }

  private async findRelevantFiles(query: ContextQuery): Promise<CodeContext['relevantFiles']> {
    const allFiles = indexingService.getFiles();
    const relevantFiles: CodeContext['relevantFiles'] = [];
    const maxFiles = query.maxFiles || 5;

    // Score files based on relevance
    const scoredFiles = allFiles
      .filter((file) => {
        // Filter by file types if specified
        if (query.fileTypes && query.fileTypes.length > 0) {
          return query.fileTypes.some((type) => file.endsWith(type));
        }
        return true;
      })
      .map((file) => {
        let score = 0;
        const fileName = path.basename(file).toLowerCase();
        const filePath = file.toLowerCase();

        // Score based on keywords in filename
        query.keywords.forEach((keyword) => {
          if (fileName.includes(keyword.toLowerCase())) {
            score += 10;
          }
          if (filePath.includes(keyword.toLowerCase())) {
            score += 5;
          }
        });

        // Boost score for certain file types
        if (file.includes('components') && query.intent.includes('component')) score += 15;
        if (file.includes('services') && query.intent.includes('service')) score += 15;
        if (file.includes('utils') && query.intent.includes('utility')) score += 15;
        if (file.includes('types') && query.intent.includes('type')) score += 10;

        return { file, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, maxFiles);

    // Read content for top scored files
    for (const { file } of scoredFiles) {
      try {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf-8');
          const type = this.determineFileType(file, content);

          relevantFiles.push({
            path: file,
            content: content.slice(0, 2000), // Limit content size
            type,
          });
        }
      } catch (error) {
        log.warn(`Could not read file ${file}: ${error}`);
      }
    }

    return relevantFiles;
  }

  private determineFileType(
    filePath: string,
    content: string
  ): CodeContext['relevantFiles'][0]['type'] {
    const fileName = path.basename(filePath).toLowerCase();

    if (
      filePath.includes('components') ||
      content.includes('export default function') ||
      content.includes('React.FC')
    ) {
      return 'component';
    }
    if (filePath.includes('services') || fileName.includes('service')) {
      return 'service';
    }
    if (filePath.includes('utils') || fileName.includes('util')) {
      return 'utility';
    }
    if (filePath.includes('types') || content.includes('interface ') || content.includes('type ')) {
      return 'type';
    }
    if (fileName.includes('config') || fileName.includes('.json')) {
      return 'config';
    }

    return 'utility';
  }

  private async extractPatterns(query: ContextQuery): Promise<CodeContext['patterns']> {
    const patterns: CodeContext['patterns'] = [];
    const files = indexingService.getFiles();

    // Extract React component patterns
    if (query.intent.includes('component') || query.keywords.includes('react')) {
      const componentPattern = await this.extractComponentPattern(files);
      if (componentPattern) patterns.push(componentPattern);
    }

    // Extract service patterns
    if (query.intent.includes('service') || query.intent.includes('api')) {
      const servicePattern = await this.extractServicePattern(files);
      if (servicePattern) patterns.push(servicePattern);
    }

    // Extract utility patterns
    if (query.intent.includes('utility') || query.intent.includes('helper')) {
      const utilityPattern = await this.extractUtilityPattern(files);
      if (utilityPattern) patterns.push(utilityPattern);
    }

    return patterns;
  }

  private async extractComponentPattern(
    files: string[]
  ): Promise<CodeContext['patterns'][0] | null> {
    const componentFiles = files.filter(
      (f) => f.includes('components') && (f.endsWith('.tsx') || f.endsWith('.jsx'))
    );

    if (componentFiles.length === 0) return null;

    try {
      const sampleFile = componentFiles[0];
      const content = fs.readFileSync(sampleFile, 'utf-8');

      return {
        type: 'React Component',
        example: content.slice(0, 500) + '...',
        usage:
          'Use this pattern for creating new React components with proper TypeScript types and exports.',
      };
    } catch (error) {
      return null;
    }
  }

  private async extractServicePattern(files: string[]): Promise<CodeContext['patterns'][0] | null> {
    const serviceFiles = files.filter((f) => f.includes('services') && f.endsWith('.ts'));

    if (serviceFiles.length === 0) return null;

    try {
      const sampleFile = serviceFiles[0];
      const content = fs.readFileSync(sampleFile, 'utf-8');

      return {
        type: 'Service Class',
        example: content.slice(0, 500) + '...',
        usage:
          'Use this pattern for creating new service classes with proper error handling and TypeScript types.',
      };
    } catch (error) {
      return null;
    }
  }

  private async extractUtilityPattern(files: string[]): Promise<CodeContext['patterns'][0] | null> {
    const utilityFiles = files.filter((f) => f.includes('utils') && f.endsWith('.ts'));

    if (utilityFiles.length === 0) return null;

    try {
      const sampleFile = utilityFiles[0];
      const content = fs.readFileSync(sampleFile, 'utf-8');

      return {
        type: 'Utility Function',
        example: content.slice(0, 300) + '...',
        usage:
          'Use this pattern for creating utility functions with proper exports and documentation.',
      };
    } catch (error) {
      return null;
    }
  }

  private async analyzeDependencies(): Promise<CodeContext['dependencies']> {
    const dependencies: CodeContext['dependencies'] = [];
    const packageJsonPath = path.join(process.cwd(), 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return dependencies;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Analyze usage of key dependencies
      const keyDeps = ['react', 'axios', 'lodash', 'express', 'typescript'];

      for (const dep of keyDeps) {
        if (allDeps[dep]) {
          const usage = await this.findDependencyUsage(dep);
          dependencies.push({
            name: dep,
            version: allDeps[dep],
            usage,
          });
        }
      }
    } catch (error) {
      log.warn(`Could not analyze dependencies: ${error}`);
    }

    return dependencies;
  }

  private async findDependencyUsage(dependency: string): Promise<string[]> {
    const files = indexingService.getFiles();
    const usage: string[] = [];

    for (const file of files.slice(0, 10)) {
      // Limit to first 10 files for performance
      try {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf-8');

          if (
            content.includes(`from '${dependency}'`) ||
            content.includes(`require('${dependency}')`)
          ) {
            // Extract import patterns
            const importRegex = new RegExp(`import\\s+.*?\\s+from\\s+['"]${dependency}['"]`, 'g');
            const matches = content.match(importRegex);
            if (matches) {
              usage.push(...matches.slice(0, 2)); // Limit to 2 examples per file
            }
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return [...new Set(usage)]; // Remove duplicates
  }

  private async extractConventions(): Promise<CodeContext['conventions']> {
    const files = indexingService.getFiles();
    const conventions = {
      naming: [] as string[],
      structure: [] as string[],
      imports: [] as string[],
    };

    // Analyze naming conventions
    const componentFiles = files.filter((f) => f.includes('components'));
    if (componentFiles.length > 0) {
      conventions.naming.push('Components use PascalCase naming (e.g., UserProfile.tsx)');
    }

    const serviceFiles = files.filter((f) => f.includes('services'));
    if (serviceFiles.length > 0) {
      conventions.naming.push('Services use camelCase with Service suffix (e.g., userService.ts)');
    }

    // Analyze structure conventions
    if (files.some((f) => f.includes('src/components'))) {
      conventions.structure.push('Components are organized in src/components/ directory');
    }
    if (files.some((f) => f.includes('src/services'))) {
      conventions.structure.push('Services are organized in src/services/ directory');
    }
    if (files.some((f) => f.includes('src/utils'))) {
      conventions.structure.push('Utilities are organized in src/utils/ directory');
    }

    // Analyze import conventions
    try {
      const sampleFile = files.find((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
      if (sampleFile && fs.existsSync(sampleFile)) {
        const content = fs.readFileSync(sampleFile, 'utf-8');

        if (content.includes("import React from 'react'")) {
          conventions.imports.push('Use \'import React from "react"\' for React imports');
        }
        if (content.includes('import { ') && content.includes(' } from ')) {
          conventions.imports.push(
            "Use named imports with destructuring: import { Component } from 'library'"
          );
        }
      }
    } catch (error) {
      // Skip if can't analyze imports
    }

    return conventions;
  }

  generateEnrichedPrompt(originalPrompt: string, context: CodeContext): string {
    const enrichedPrompt = `
You are an expert developer working on this specific project.

${originalPrompt}

**CRITICAL PROJECT CONTEXT:**

## Project Rules:
${context.projectRules}

## Relevant Code Examples:
${context.relevantFiles
  .map(
    (file) => `
### ${file.path} (${file.type})
\`\`\`
${file.content}
\`\`\`
`
  )
  .join('\n')}

## Established Patterns:
${context.patterns
  .map(
    (pattern) => `
**${pattern.type}:**
${pattern.usage}

Example:
\`\`\`
${pattern.example}
\`\`\`
`
  )
  .join('\n')}

## Dependencies in Use:
${context.dependencies
  .map(
    (dep) => `
- **${dep.name}** (${dep.version}): ${dep.usage.join(', ')}
`
  )
  .join('\n')}

## Project Conventions:
**Naming:** ${context.conventions.naming.join(', ')}
**Structure:** ${context.conventions.structure.join(', ')}
**Imports:** ${context.conventions.imports.join(', ')}

**IMPORTANT:** Follow the existing patterns and conventions shown above. Use the same import styles, naming conventions, and code structure as demonstrated in the examples.
`;

    return enrichedPrompt;
  }

  async clearCache(): Promise<void> {
    this.projectRulesCache = null;
    this.patternsCache.clear();
    log.info('🧹 Context cache cleared');
  }
}

export const contextService = ContextService.getInstance();

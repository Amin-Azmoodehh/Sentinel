import fs from 'node:fs';
import path from 'node:path';
import { indexingService } from './indexingService.js';
import { log } from '../utils/logger.js';

export interface WorkflowContext {
  projectRoot: string;
  framework: 'react' | 'vue' | 'angular' | 'node' | 'typescript';
  styleFramework?: 'tailwind' | 'styled-components' | 'css-modules' | 'scss';
  testFramework?: 'jest' | 'vitest' | 'mocha' | 'cypress';
  patterns: CodePattern[];
}

export interface CodePattern {
  type: 'component' | 'service' | 'utility' | 'hook' | 'api';
  template: string;
  imports: string[];
  exports: string[];
  dependencies: string[];
}

export interface ScaffoldComponentOptions {
  name: string;
  path: string;
  framework: 'react' | 'vue' | 'angular';
  style?: 'tailwind' | 'styled-components' | 'css-modules';
  includeTest?: boolean;
  includeStory?: boolean;
  props?: Array<{ name: string; type: string; optional?: boolean }>;
}

export interface RefactorRenameOptions {
  filePath: string;
  oldName: string;
  newName: string;
  scope?: 'file' | 'project';
}

export interface CreateApiEndpointOptions {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  requestType?: string;
  responseType?: string;
  includeValidation?: boolean;
  includeTest?: boolean;
}

export class WorkflowService {
  private static instance: WorkflowService;
  private context: WorkflowContext | null = null;

  static getInstance(): WorkflowService {
    if (!WorkflowService.instance) {
      WorkflowService.instance = new WorkflowService();
    }
    return WorkflowService.instance;
  }

  async analyzeProject(): Promise<WorkflowContext> {
    if (this.context) {
      return this.context;
    }

    log.info('🔍 Analyzing project structure and patterns...');

    const projectRoot = process.cwd();
    const packageJsonPath = path.join(projectRoot, 'package.json');

    // Detect framework
    let framework: WorkflowContext['framework'] = 'typescript';
    let styleFramework: WorkflowContext['styleFramework'];
    let testFramework: WorkflowContext['testFramework'];

    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Framework detection
      if (deps.react) framework = 'react';
      else if (deps.vue) framework = 'vue';
      else if (deps['@angular/core']) framework = 'angular';
      else if (deps.express || deps.fastify) framework = 'node';

      // Style framework detection
      if (deps.tailwindcss) styleFramework = 'tailwind';
      else if (deps['styled-components']) styleFramework = 'styled-components';
      else if (deps.sass || deps.scss) styleFramework = 'scss';

      // Test framework detection
      if (deps.jest) testFramework = 'jest';
      else if (deps.vitest) testFramework = 'vitest';
      else if (deps.mocha) testFramework = 'mocha';
      else if (deps.cypress) testFramework = 'cypress';
    }

    // Extract existing patterns
    const patterns = await this.extractCodePatterns();

    this.context = {
      projectRoot,
      framework,
      styleFramework,
      testFramework,
      patterns,
    };

    log.success(
      `✅ Project analysis complete: ${framework} with ${patterns.length} patterns detected`
    );
    return this.context;
  }

  private async extractCodePatterns(): Promise<CodePattern[]> {
    const patterns: CodePattern[] = [];
    const files = indexingService.getFiles();

    // Extract React component patterns
    const componentFiles = files.filter(
      (f) => f.includes('components') && (f.endsWith('.tsx') || f.endsWith('.jsx'))
    );

    if (componentFiles.length > 0) {
      const sampleComponent = componentFiles[0];
      try {
        const content = fs.readFileSync(sampleComponent, 'utf-8');
        const imports = this.extractImports(content);
        const exports = this.extractExports(content);

        patterns.push({
          type: 'component',
          template: this.createComponentTemplate(content),
          imports,
          exports,
          dependencies: this.extractDependencies(content),
        });
      } catch (error) {
        log.warn(`Could not analyze component pattern from ${sampleComponent}`);
      }
    }

    // Extract service patterns
    const serviceFiles = files.filter((f) => f.includes('services') && f.endsWith('.ts'));

    if (serviceFiles.length > 0) {
      const sampleService = serviceFiles[0];
      try {
        const content = fs.readFileSync(sampleService, 'utf-8');
        patterns.push({
          type: 'service',
          template: this.createServiceTemplate(content),
          imports: this.extractImports(content),
          exports: this.extractExports(content),
          dependencies: this.extractDependencies(content),
        });
      } catch (error) {
        log.warn(`Could not analyze service pattern from ${sampleService}`);
      }
    }

    return patterns;
  }

  private extractImports(content: string): string[] {
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"];?/g;
    const imports: string[] = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return [...new Set(imports)];
  }

  private extractExports(content: string): string[] {
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|interface|type)\s+(\w+)/g;
    const exports: string[] = [];
    let match;

    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    return exports;
  }

  private extractDependencies(content: string): string[] {
    const deps: string[] = [];

    // Extract React hooks usage
    if (content.includes('useState')) deps.push('useState');
    if (content.includes('useEffect')) deps.push('useEffect');
    if (content.includes('useContext')) deps.push('useContext');

    // Extract common libraries
    if (content.includes('axios')) deps.push('axios');
    if (content.includes('lodash')) deps.push('lodash');

    return [...new Set(deps)];
  }

  private createComponentTemplate(content: string): string {
    // Extract the basic structure and create a template
    const lines = content.split('\n');
    const template = lines
      .map((line) => {
        // Replace specific component names with placeholders
        return line
          .replace(
            /export\s+(?:default\s+)?(?:function|const)\s+\w+/g,
            'export default function {{COMPONENT_NAME}}'
          )
          .replace(/interface\s+\w+Props/g, 'interface {{COMPONENT_NAME}}Props');
      })
      .join('\n');

    return template;
  }

  private createServiceTemplate(content: string): string {
    const lines = content.split('\n');
    return lines
      .map((line) => {
        return line
          .replace(/class\s+\w+Service/g, 'class {{SERVICE_NAME}}Service')
          .replace(/export\s+const\s+\w+Service/g, 'export const {{SERVICE_NAME}}Service');
      })
      .join('\n');
  }

  async scaffoldComponent(options: ScaffoldComponentOptions): Promise<boolean> {
    try {
      log.info(`🏗️ Scaffolding ${options.framework} component: ${options.name}`);

      const context = await this.analyzeProject();
      const componentPattern = context.patterns.find((p) => p.type === 'component');

      const componentDir = path.join(options.path, options.name);
      const componentFile = path.join(componentDir, `${options.name}.tsx`);
      const testFile = path.join(componentDir, `${options.name}.test.tsx`);
      const storyFile = path.join(componentDir, `${options.name}.stories.tsx`);

      // Create directory
      fs.mkdirSync(componentDir, { recursive: true });

      // Generate component content
      const componentContent = this.generateComponentContent(options, componentPattern);
      fs.writeFileSync(componentFile, componentContent);
      log.success(`✅ Created component: ${componentFile}`);

      // Generate test file
      if (options.includeTest) {
        const testContent = this.generateTestContent(options, context);
        fs.writeFileSync(testFile, testContent);
        log.success(`✅ Created test: ${testFile}`);
      }

      // Generate story file
      if (options.includeStory) {
        const storyContent = this.generateStoryContent(options);
        fs.writeFileSync(storyFile, storyContent);
        log.success(`✅ Created story: ${storyFile}`);
      }

      // Update index file if exists
      const indexFile = path.join(options.path, 'index.ts');
      if (fs.existsSync(indexFile)) {
        const indexContent = fs.readFileSync(indexFile, 'utf-8');
        const exportLine = `export { default as ${options.name} } from './${options.name}/${options.name}';`;
        if (!indexContent.includes(exportLine)) {
          fs.appendFileSync(indexFile, `\n${exportLine}`);
          log.success(`✅ Updated index exports`);
        }
      }

      return true;
    } catch (error) {
      log.error(
        `❌ Failed to scaffold component: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  private generateComponentContent(
    options: ScaffoldComponentOptions,
    pattern?: CodePattern
  ): string {
    const { name, props = [] } = options;

    // Generate props interface
    const propsInterface =
      props.length > 0
        ? `
interface ${name}Props {
${props.map((prop) => `  ${prop.name}${prop.optional ? '?' : ''}: ${prop.type};`).join('\n')}
}
`
        : '';

    // Generate component
    const propsParam = props.length > 0 ? `props: ${name}Props` : '';
    const propsDestructure =
      props.length > 0 ? `const { ${props.map((p) => p.name).join(', ')} } = props;` : '';

    return `import React from 'react';
${options.style === 'styled-components' ? "import styled from 'styled-components';" : ''}
${propsInterface}
export default function ${name}(${propsParam}) {
  ${propsDestructure}

  return (
    <div className="${options.style === 'tailwind' ? 'p-4' : name.toLowerCase()}">
      <h2>${name} Component</h2>
      {/* Component content goes here */}
    </div>
  );
}
`;
  }

  private generateTestContent(options: ScaffoldComponentOptions, context: WorkflowContext): string {
    const testFramework = context.testFramework || 'jest';

    return `import React from 'react';
import { render, screen } from '@testing-library/react';
import ${options.name} from './${options.name}';

describe('${options.name}', () => {
  it('renders without crashing', () => {
    render(<${options.name} />);
    expect(screen.getByText('${options.name} Component')).toBeInTheDocument();
  });

  // Add more tests here
});
`;
  }

  private generateStoryContent(options: ScaffoldComponentOptions): string {
    return `import type { Meta, StoryObj } from '@storybook/react';
import ${options.name} from './${options.name}';

const meta: Meta<typeof ${options.name}> = {
  title: 'Components/${options.name}',
  component: ${options.name},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
`;
  }

  async refactorRenameSymbol(options: RefactorRenameOptions): Promise<boolean> {
    try {
      log.info(`🔄 Refactoring: ${options.oldName} → ${options.newName}`);

      const files = options.scope === 'project' ? indexingService.getFiles() : [options.filePath];

      let filesChanged = 0;

      for (const file of files) {
        if (!fs.existsSync(file)) continue;

        const content = fs.readFileSync(file, 'utf-8');
        const regex = new RegExp(`\\b${options.oldName}\\b`, 'g');

        if (regex.test(content)) {
          const newContent = content.replace(regex, options.newName);
          fs.writeFileSync(file, newContent);
          filesChanged++;
          log.info(`  ✅ Updated: ${file}`);
        }
      }

      log.success(`✅ Refactoring complete: ${filesChanged} files updated`);
      return true;
    } catch (error) {
      log.error(`❌ Refactoring failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async createApiEndpoint(options: CreateApiEndpointOptions): Promise<boolean> {
    try {
      log.info(`🌐 Creating API endpoint: ${options.method} ${options.path}`);

      const context = await this.analyzeProject();
      const endpointDir = path.join('src', 'api', 'endpoints');
      const endpointFile = path.join(endpointDir, `${options.name}.ts`);

      fs.mkdirSync(endpointDir, { recursive: true });

      const endpointContent = this.generateApiEndpointContent(options, context);
      fs.writeFileSync(endpointFile, endpointContent);

      if (options.includeTest) {
        const testFile = path.join(endpointDir, `${options.name}.test.ts`);
        const testContent = this.generateApiTestContent(options);
        fs.writeFileSync(testFile, testContent);
      }

      log.success(`✅ API endpoint created: ${endpointFile}`);
      return true;
    } catch (error) {
      log.error(
        `❌ Failed to create API endpoint: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  private generateApiEndpointContent(
    options: CreateApiEndpointOptions,
    context: WorkflowContext
  ): string {
    const { name, method, path: apiPath, requestType, responseType } = options;

    return `import { Request, Response } from 'express';
${requestType ? `import { ${requestType} } from '../types/requests';` : ''}
${responseType ? `import { ${responseType} } from '../types/responses';` : ''}

/**
 * ${method} ${apiPath}
 * ${name} endpoint
 */
export async function ${name}(
  req: Request${requestType ? `<{}, {}, ${requestType}>` : ''},
  res: Response${responseType ? `<${responseType}>` : ''}
) {
  try {
    ${options.includeValidation ? '// Add validation logic here' : ''}
    
    // Implementation goes here
    const result = {
      message: '${name} endpoint',
      data: null,
    };
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in ${name}:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
`;
  }

  private generateApiTestContent(options: CreateApiEndpointOptions): string {
    return `import request from 'supertest';
import app from '../../app'; // Adjust path as needed
import { ${options.name} } from './${options.name}';

describe('${options.method} ${options.path}', () => {
  it('should respond with 200 status', async () => {
    const response = await request(app)
      .${options.method.toLowerCase()}('${options.path}')
      ${options.method === 'POST' || options.method === 'PUT' ? '.send({})' : ''}
      .expect(200);
    
    expect(response.body).toHaveProperty('message');
  });

  // Add more tests here
});
`;
  }
}

export const workflowService = WorkflowService.getInstance();

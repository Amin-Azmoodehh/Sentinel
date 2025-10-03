import fs from 'node:fs';
import path from 'node:path';
import { runGate } from './gateService.js';
import { enhancedShellService } from './enhancedShellService.js';
import { log } from '../utils/logger.js';

interface CICDConfig {
  provider: 'github' | 'gitlab' | 'jenkins' | 'custom';
  stages: CICDStage[];
  notifications?: {
    onSuccess?: string[];
    onFailure?: string[];
  };
}

interface CICDStage {
  name: string;
  commands: string[];
  continueOnError?: boolean;
  timeout?: number;
}

interface CICDResult {
  success: boolean;
  stages: StageResult[];
  duration: number;
  timestamp: number;
}

interface StageResult {
  name: string;
  success: boolean;
  output: string;
  duration: number;
}

export class CICDService {
  async generateGitHubWorkflow(_projectName: string): Promise<string> {
    return `name: SentinelTM CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm install
        
      - name: Run SentinelTM Quality Gate
        run: npx st gate run --min 95
        
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: quality-report
          path: .sentineltm/reports/
`;
  }

  async generateGitLabCI(_projectName: string): Promise<string> {
    return `stages:
  - test
  - quality

quality-gate:
  stage: quality
  image: node:18
  script:
    - npm install
    - npx st gate run --min 95
  artifacts:
    paths:
      - .sentineltm/reports/
    expire_in: 1 week
  only:
    - main
    - develop
`;
  }

  async runPipeline(config: CICDConfig): Promise<CICDResult> {
    const startTime = Date.now();
    const stageResults: StageResult[] = [];

    for (const stage of config.stages) {
      const stageStart = Date.now();
      log.info(`Running stage: ${stage.name}`);

      try {
        const results = await enhancedShellService.executeMultipleCommands(stage.commands, {
          continueOnError: stage.continueOnError,
          timeout: stage.timeout || 300000,
        });

        const success = results.every((r) => r.success);
        const output = results.map((r) => r.stdout + r.stderr).join('\n');

        stageResults.push({
          name: stage.name,
          success,
          output,
          duration: Date.now() - stageStart,
        });

        if (!success && !stage.continueOnError) {
          break;
        }
      } catch (error) {
        stageResults.push({
          name: stage.name,
          success: false,
          output: (error as Error).message,
          duration: Date.now() - stageStart,
        });
        break;
      }
    }

    const result: CICDResult = {
      success: stageResults.every((s) => s.success),
      stages: stageResults,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };

    await this.saveResult(result);
    return result;
  }

  async runQualityGate(): Promise<{ passed: boolean; score: number }> {
    try {
      const result = await runGate();
      return { passed: result.score >= result.threshold, score: result.score };
    } catch (error) {
      log.error(`Quality gate failed: ${(error as Error).message}`);
      return { passed: false, score: 0 };
    }
  }

  private async saveResult(result: CICDResult): Promise<void> {
    const reportsDir = path.join(process.cwd(), '.sentineltm', 'reports');
    fs.mkdirSync(reportsDir, { recursive: true });

    const reportPath = path.join(reportsDir, `cicd-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    log.info(`CI/CD report saved: ${reportPath}`);
  }

  async getLastResults(count = 10): Promise<CICDResult[]> {
    const reportsDir = path.join(process.cwd(), '.sentineltm', 'reports');

    if (!fs.existsSync(reportsDir)) {
      return [];
    }

    const files = fs
      .readdirSync(reportsDir)
      .filter((f) => f.startsWith('cicd-') && f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, count);

    return files.map((f) => {
      const content = fs.readFileSync(path.join(reportsDir, f), 'utf-8');
      return JSON.parse(content) as CICDResult;
    });
  }
}

export const cicdService = new CICDService();

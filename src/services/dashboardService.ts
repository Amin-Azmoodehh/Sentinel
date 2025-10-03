import { indexStatus } from './indexService.js';
import * as taskService from './taskService.js';
import { configService } from './configService.js';
import os from 'node:os';
import { log } from '../utils/logger.js';

interface DashboardMetrics {
  project: {
    name: string;
    root: string;
    filesIndexed: number;
    symbolsIndexed: number;
    lastIndexRun: number | null;
  };
  tasks: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    blocked: number;
  };
  quality: {
    lastScore: number;
    lastRun: number | null;
    threshold: number;
    passing: boolean;
  };
  system: {
    platform: string;
    memory: { used: number; total: number; percentage: number };
    uptime: number;
  };
  activity: {
    recentCommands: string[];
    lastActivity: number;
  };
}

export class DashboardService {
  private commandHistory: string[] = [];
  private maxHistorySize = 50;
  private cachedMetrics: DashboardMetrics | null = null;
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor() {
    this.refreshCache(); // Initial cache population
    setInterval(() => this.refreshCache(), this.CACHE_TTL);
  }

  private async refreshCache(): Promise<void> {
    try {
      this.cachedMetrics = await this.fetchMetrics();
      log.info('Dashboard cache refreshed.');
    } catch (error) {
      log.error(`Failed to refresh dashboard cache: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async getMetrics(): Promise<DashboardMetrics> {
    return this.cachedMetrics ?? this.fetchMetrics();
  }

  private async fetchMetrics(): Promise<DashboardMetrics> {
    try {
      const config = configService.load();
      const indexInfo = indexStatus();

      const [tasks, quality] = await Promise.all([
        this.getTaskStats(),
        this.getQualityStats(),
      ]);

      const metrics: DashboardMetrics = {
        project: {
          name: (config as any).project?.name || 'Unknown',
          root: process.cwd(),
          filesIndexed: indexInfo.files,
          symbolsIndexed: indexInfo.symbols,
          lastIndexRun: indexInfo.lastRun,
        },
        tasks,
        quality,
        system: this.getSystemStats(),
        activity: {
          recentCommands: this.commandHistory.slice(-10),
          lastActivity: Date.now(),
        },
      };
      return metrics;
    } catch (error) {
      log.error(`Dashboard failed to fetch metrics: ${error instanceof Error ? error.message : String(error)}`);
      return {
        project: { name: 'Error', root: process.cwd(), filesIndexed: 0, symbolsIndexed: 0, lastIndexRun: null },
        tasks: { total: 0, pending: 0, inProgress: 0, completed: 0, blocked: 0 },
        quality: { lastScore: 0, lastRun: null, threshold: 0, passing: false },
        system: { platform: 'unknown', memory: { used: 0, total: 0, percentage: 0 }, uptime: 0 },
        activity: { recentCommands: [], lastActivity: Date.now() },
      };
    }
  }

  private async getTaskStats() {
    try {
      const allTasks = taskService.listTasks();
      return {
        total: allTasks.length,
        pending: allTasks.filter((t: any) => t.status === 'open').length,
        inProgress: allTasks.filter((t: any) => t.status === 'in-progress').length,
        completed: allTasks.filter((t: any) => t.status === 'done').length,
        blocked: allTasks.filter((t: any) => t.status === 'blocked').length,
      };
    } catch {
      return { total: 0, pending: 0, inProgress: 0, completed: 0, blocked: 0 };
    }
  }

  private async getQualityStats() {
    const config = configService.load();
    const threshold = config.thresholds?.gate || 95;
    try {
      const lastRun = (config.meta?.gate as any)?.lastRun;
      if (lastRun && typeof lastRun.score === 'number') {
        return {
          lastScore: lastRun.score,
          lastRun: lastRun.timestamp || Date.now(),
          threshold,
          passing: lastRun.score >= threshold,
        };
      }
      return { lastScore: 0, lastRun: null, threshold, passing: false };
    } catch {
      return { lastScore: 0, lastRun: null, threshold, passing: false };
    }
  }

  private getSystemStats() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    return {
      platform: `${os.platform()} ${os.arch()}`,
      memory: {
        used: Math.round(usedMem / 1024 / 1024),
        total: Math.round(totalMem / 1024 / 1024),
        percentage: Math.round((usedMem / totalMem) * 100),
      },
      uptime: Math.round(os.uptime()),
    };
  }

  recordCommand(command: string): void {
    this.commandHistory.push(command);
    if (this.commandHistory.length > this.maxHistorySize) {
      this.commandHistory.shift();
    }
  }

  async generateReport(): Promise<string> {
    const metrics = await this.getMetrics();
    return `
# SentinelTM Dashboard Report

## Project: ${metrics.project.name}
- Root: ${metrics.project.root}
- Files Indexed: ${metrics.project.filesIndexed}
- Symbols: ${metrics.project.symbolsIndexed}

## Tasks
- Total: ${metrics.tasks.total}
- Pending: ${metrics.tasks.pending}
- In Progress: ${metrics.tasks.inProgress}
- Completed: ${metrics.tasks.completed}
- Blocked: ${metrics.tasks.blocked}

## Quality
- Score: ${metrics.quality.lastScore}/${metrics.quality.threshold}
- Status: ${metrics.quality.passing ? '✅ PASSING' : '❌ FAILING'}

## System
- Platform: ${metrics.system.platform}
- Memory: ${metrics.system.memory.used}MB / ${metrics.system.memory.total}MB (${metrics.system.memory.percentage}%)
- Uptime: ${Math.floor(metrics.system.uptime / 3600)}h ${Math.floor((metrics.system.uptime % 3600) / 60)}m

Generated: ${new Date().toISOString()}
    `.trim();
  }
}

export const dashboardService = new DashboardService();

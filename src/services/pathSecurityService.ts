import path from 'node:path';
import os from 'node:os';
import { configService } from './configService.js';

interface PathRule {
  pattern: string | RegExp;
  type: 'whitelist' | 'blacklist';
  reason?: string;
}

const SYSTEM_PATHS = [
  /^[A-Z]:\\Windows/i,
  /^[A-Z]:\\Program Files/i,
  /^\/System/,
  /^\/Library/,
  /^\/usr\/bin/,
  /^\/usr\/sbin/,
  /^\/bin/,
  /^\/sbin/,
  /^\/etc/,
  /^\/var\/log/,
  /^\/proc/,
  /^\/sys/,
];

export class PathSecurityService {
  private whitelist: PathRule[] = [];
  private blacklist: PathRule[] = [];
  private workspaceRoot: string;

  constructor() {
    this.workspaceRoot = path.resolve(process.cwd());
    this.initializeDefaults();
    this.loadFromConfig();
  }

  private initializeDefaults(): void {
    SYSTEM_PATHS.forEach((pattern) => {
      this.blacklist.push({ pattern, type: 'blacklist', reason: 'System path' });
    });

    this.blacklist.push(
      { pattern: os.homedir(), type: 'blacklist', reason: 'Home directory' },
      { pattern: /node_modules/, type: 'blacklist', reason: 'Dependencies' },
      { pattern: /\.git/, type: 'blacklist', reason: 'Version control' }
    );
  }

  private loadFromConfig(): void {
    const config = configService.load();
    const security = config.security as Record<string, unknown>;

    if (security?.pathWhitelist && Array.isArray(security.pathWhitelist)) {
      security.pathWhitelist.forEach((p: string) => {
        this.whitelist.push({ pattern: p, type: 'whitelist' });
      });
    }

    if (security?.pathBlacklist && Array.isArray(security.pathBlacklist)) {
      security.pathBlacklist.forEach((p: string) => {
        this.blacklist.push({ pattern: p, type: 'blacklist' });
      });
    }
  }

  validatePath(targetPath: string): { valid: boolean; reason?: string } {
    const normalized = path.normalize(path.resolve(targetPath));

    for (const rule of this.blacklist) {
      if (this.matchesPattern(normalized, rule.pattern)) {
        return { valid: false, reason: rule.reason || 'Blacklisted path' };
      }
    }

    if (this.whitelist.length > 0) {
      const whitelisted = this.whitelist.some((rule) =>
        this.matchesPattern(normalized, rule.pattern)
      );
      if (!whitelisted) {
        return { valid: false, reason: 'Path not in whitelist' };
      }
    }

    if (!normalized.startsWith(this.workspaceRoot)) {
      return { valid: false, reason: 'Outside workspace' };
    }

    return { valid: true };
  }

  private matchesPattern(path: string, pattern: string | RegExp): boolean {
    if (typeof pattern === 'string') {
      return path.includes(pattern);
    }
    return pattern.test(path);
  }

  addWhitelist(pattern: string): void {
    this.whitelist.push({ pattern, type: 'whitelist' });
    this.saveToConfig();
  }

  addBlacklist(pattern: string, reason?: string): void {
    this.blacklist.push({ pattern, type: 'blacklist', reason });
    this.saveToConfig();
  }

  private saveToConfig(): void {
    const config = configService.load();
    const security = config.security || {
      forbidden: [],
      requiredRootDirs: ['src', '.sentineltm'],
      shell: { allowedCommands: [], blockedCommands: [] },
    };

    (security as Record<string, unknown>).pathWhitelist = this.whitelist
      .filter((r) => typeof r.pattern === 'string')
      .map((r) => r.pattern);

    (security as Record<string, unknown>).pathBlacklist = this.blacklist
      .filter((r) => typeof r.pattern === 'string')
      .map((r) => r.pattern);

    config.security = security;
    configService.save(config);
  }

  getWhitelist(): PathRule[] {
    return [...this.whitelist];
  }

  getBlacklist(): PathRule[] {
    return [...this.blacklist];
  }
}

export const pathSecurityService = new PathSecurityService();

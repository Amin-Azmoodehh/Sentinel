import fs from 'node:fs';
import path from 'node:path';
import { indexProject, searchIndex } from './indexService.js';
import { pathSecurityService } from './pathSecurityService.js';
import { log } from '../utils/logger.js';

interface IndexOptions {
  root?: string;
  exclude?: string[];
  include?: string[];
  maxFileSize?: number;
  followSymlinks?: boolean;
  externalProjects?: string[];
}

interface IndexStats {
  filesIndexed: number;
  filesSkipped: number;
  totalSize: number;
  duration: number;
  errors: string[];
}

export class AdvancedIndexService {
  private indexCache = new Map<string, number>();

  async indexWithOptions(options: IndexOptions = {}): Promise<IndexStats> {
    const startTime = Date.now();
    const stats: IndexStats = {
      filesIndexed: 0,
      filesSkipped: 0,
      totalSize: 0,
      duration: 0,
      errors: [],
    };

    const roots = [options.root || process.cwd(), ...(options.externalProjects || [])];

    for (const root of roots) {
      const validation = pathSecurityService.validatePath(root);
      if (!validation.valid) {
        stats.errors.push(`Skipped ${root}: ${validation.reason}`);
        continue;
      }

      try {
        await this.indexDirectory(root, options, stats);
      } catch (error) {
        stats.errors.push(`Error indexing ${root}: ${(error as Error).message}`);
      }
    }

    stats.duration = Date.now() - startTime;
    return stats;
  }

  private async indexDirectory(
    root: string,
    options: IndexOptions,
    stats: IndexStats
  ): Promise<void> {
    const files = this.collectFiles(root, options);

    for (const file of files) {
      try {
        const fileStats = fs.statSync(file);

        if (options.maxFileSize && fileStats.size > options.maxFileSize) {
          stats.filesSkipped++;
          continue;
        }

        indexProject(root);
        stats.filesIndexed++;
        stats.totalSize += fileStats.size;
      } catch (error) {
        stats.filesSkipped++;
        stats.errors.push(`Failed to index ${file}: ${(error as Error).message}`);
      }
    }
  }

  private collectFiles(root: string, options: IndexOptions): string[] {
    const files: string[] = [];
    const stack = [root];

    while (stack.length > 0) {
      const current = stack.pop()!;

      try {
        const entries = fs.readdirSync(current, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(current, entry.name);

          if (this.shouldExclude(fullPath, options.exclude)) {
            continue;
          }

          if (entry.isDirectory()) {
            if (options.followSymlinks || !entry.isSymbolicLink()) {
              stack.push(fullPath);
            }
          } else if (entry.isFile()) {
            if (this.shouldInclude(fullPath, options.include)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        log.warn(`Cannot read directory ${current}: ${(error as Error).message}`);
      }
    }

    return files;
  }

  private shouldExclude(filePath: string, excludePatterns?: string[]): boolean {
    if (!excludePatterns || excludePatterns.length === 0) {
      return false;
    }

    const normalized = path.normalize(filePath);
    return excludePatterns.some((pattern) => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(normalized);
    });
  }

  private shouldInclude(filePath: string, includePatterns?: string[]): boolean {
    if (!includePatterns || includePatterns.length === 0) {
      return true;
    }

    const normalized = path.normalize(filePath);
    return includePatterns.some((pattern) => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(normalized);
    });
  }

  async searchWithFilters(
    query: string,
    filters?: {
      fileTypes?: string[];
      excludePaths?: string[];
      maxResults?: number;
    }
  ) {
    let results = searchIndex(query);

    if (filters?.fileTypes) {
      results = results.filter((r) => filters.fileTypes!.some((ext) => r.file.endsWith(ext)));
    }

    if (filters?.excludePaths) {
      results = results.filter((r) => !filters.excludePaths!.some((p) => r.file.includes(p)));
    }

    if (filters?.maxResults) {
      results = results.slice(0, filters.maxResults);
    }

    return results;
  }

  clearCache(): void {
    this.indexCache.clear();
  }
}

export const advancedIndexService = new AdvancedIndexService();

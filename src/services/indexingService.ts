import fg from 'fast-glob';
import { configService } from './configService.js';
import { log } from '../utils/logger.js';

class IndexingService {
  private static instance: IndexingService;

  private constructor() {}

  public static getInstance(): IndexingService {
    if (!IndexingService.instance) {
      IndexingService.instance = new IndexingService();
    }
    return IndexingService.instance;
  }

  public getFiles(): string[] {
    try {
      const config = configService.load();
      
      // Debug: check if indexing config exists
      if (!config.indexing) {
        log.warn('No indexing configuration found in config! Using defaults.');
      }
      
      const include = (config.indexing as any)?.include || ['**/*.{ts,tsx,js,jsx,json,md,yml,yaml}'];
      const ignore = (config.indexing as any)?.ignore || [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.git/**',
        '*.log',
        '.sentineltm/db/**',
      ];

      log.info(`CWD: ${process.cwd()}`);
      log.info(`Include patterns: ${JSON.stringify(include)}`);
      log.info(`Ignore patterns: ${JSON.stringify(ignore)}`);

      const files = fg.sync(include, {
        cwd: process.cwd(),
        ignore,
        onlyFiles: true,
        dot: false, // Don't include hidden files by default
      });

      log.info(`✅ Indexed ${files.length} files`);
      
      if (files.length === 0) {
        log.error('⚠️ WARNING: No files found! This may indicate an indexing problem.');
        log.error(`Try running: ls -la in ${process.cwd()}`);
      }
      
      return files;
    } catch (error) {
      log.error(`Indexing error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
}

export const indexingService = IndexingService.getInstance();

import fg from 'fast-glob';
import fs from 'node:fs';
import path from 'node:path';
import { configService } from './configService.js';
import { log } from '../utils/logger.js';

class IndexingService {
  private static instance: IndexingService;
  private cachedFiles: string[] = [];
  private lastIndexTime: number = 0;

  private constructor() {}

  public static getInstance(): IndexingService {
    if (!IndexingService.instance) {
      IndexingService.instance = new IndexingService();
    }
    return IndexingService.instance;
  }

  public buildIndex(): void {
    try {
      log.info('Building project index...');
      this.cachedFiles = this.scanFiles();
      this.lastIndexTime = Date.now();

      // Save to persistent storage
      this.saveIndexToFile();

      log.success(`✅ Index built successfully: ${this.cachedFiles.length} files indexed`);
    } catch (error) {
      log.error(`Failed to build index: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private saveIndexToFile(): void {
    try {
      const indexDir = path.join(process.cwd(), '.sentineltm', 'db');
      const indexFile = path.join(indexDir, 'index.json');

      // Ensure directory exists
      fs.mkdirSync(indexDir, { recursive: true });

      const indexData = {
        files: this.cachedFiles,
        lastUpdated: this.lastIndexTime,
        version: '1.0.0',
      };

      fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2));
      log.info(`Index saved to ${indexFile}`);
    } catch (error) {
      log.warn(
        `Could not save index to file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private loadIndexFromFile(): void {
    try {
      const indexFile = path.join(process.cwd(), '.sentineltm', 'db', 'index.json');

      if (fs.existsSync(indexFile)) {
        const indexData = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
        this.cachedFiles = indexData.files || [];
        this.lastIndexTime = indexData.lastUpdated || 0;
        log.info(`Loaded index from file: ${this.cachedFiles.length} files`);
      }
    } catch (error) {
      log.warn(
        `Could not load index from file: ${error instanceof Error ? error.message : String(error)}`
      );
      this.cachedFiles = [];
      this.lastIndexTime = 0;
    }
  }

  private scanFiles(): string[] {
    try {
      const config = configService.load();

      // Debug: check if indexing config exists
      if (!config.indexing) {
        log.warn('No indexing configuration found in config! Using defaults.');
      }

      const include = config.indexing?.include || ['**/*.{ts,tsx,js,jsx,json,md,yml,yaml}'];
      const ignore = config.indexing?.ignore || [
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

      log.info(`✅ Scanned ${files.length} files`);

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

  public getFiles(): string[] {
    // Load from cache first, if empty try to load from file
    if (this.cachedFiles.length === 0) {
      this.loadIndexFromFile();
    }

    // If still empty, build fresh index
    if (this.cachedFiles.length === 0) {
      log.warn('No cached index found. Building fresh index...');
      this.buildIndex();
    }

    return this.cachedFiles;
  }

  public getIndexStatus(): { files: number; lastUpdated: Date | null } {
    if (this.cachedFiles.length === 0) {
      this.loadIndexFromFile();
    }

    return {
      files: this.cachedFiles.length,
      lastUpdated: this.lastIndexTime > 0 ? new Date(this.lastIndexTime) : null,
    };
  }
}

export const indexingService = IndexingService.getInstance();

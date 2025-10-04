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
    const config = configService.load();
    const include = config.indexing?.include || ['**/*'];
    const ignore = config.indexing?.ignore || ['node_modules/**', 'dist/**', '.git/**'];

    log.info(`Indexing files with include pattern: ${JSON.stringify(include)}`);
    log.info(`Ignoring files with pattern: ${JSON.stringify(ignore)}`);

    const files = fg.sync(include, {
      cwd: process.cwd(),
      ignore,
      onlyFiles: true,
      dot: true,
    });

    log.info(`Found ${files.length} files for indexing.`);
    return files;
  }
}

export const indexingService = IndexingService.getInstance();

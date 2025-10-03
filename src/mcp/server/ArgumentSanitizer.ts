import { SecurityValidator } from '../securityValidator.js';
import { log } from '../../utils/logger.js';

export class ArgumentSanitizer {
  private sanitizationCache = new Map<string, string>();
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly MAX_ARRAY_SIZE = 50;
  private readonly MAX_OBJECT_SIZE = 50;
  private readonly MAX_DEPTH = 3;

  sanitize(args: Record<string, unknown>): Record<string, unknown> {
    if (!args || typeof args !== 'object') {
      return {};
    }

    const sanitized: Record<string, unknown> = {};
    const entries = Object.entries(args);
    const limit = Math.min(entries.length, this.MAX_OBJECT_SIZE);

    for (let i = 0; i < limit; i++) {
      const [key, value] = entries[i];
      if (!SecurityValidator.isValidObjectKey(key)) {
        log.warn(`Invalid argument key detected and skipped: ${key}`);
        continue;
      }

      sanitized[key] = this.sanitizeValue(value, this.MAX_DEPTH);
    }

    return sanitized;
  }

  private sanitizeValue(value: unknown, depth: number): unknown {
    if (depth <= 0) {
      return '[MAX_DEPTH_REACHED]';
    }

    if (typeof value === 'string') {
      return this.sanitizeStringValue(value);
    } else if (Array.isArray(value)) {
      return this.sanitizeArray(value, depth);
    } else if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    } else if (typeof value === 'boolean') {
      return value;
    } else if (value && typeof value === 'object') {
      return this.sanitizeNestedObject(value, depth - 1);
    }
    return undefined;
  }

  private sanitizeArray(value: unknown[], depth: number): unknown[] {
    if (value.length === 0) {
      return [];
    }

    const limit = Math.min(value.length, this.MAX_ARRAY_SIZE);
    const result: unknown[] = new Array(limit);

    for (let i = 0; i < limit; i++) {
      const item = value[i];
      if (item != null) {
        result[i] = this.sanitizeValue(item, depth);
      }
    }

    return result.filter((item) => item !== null && item !== undefined);
  }

  private sanitizeStringValue(str: string): string {
    if (typeof str !== 'string' || str.length === 0) {
      return '';
    }

    const cached = this.sanitizationCache.get(str);
    if (cached !== undefined) {
      return cached;
    }

    // Check for dangerous patterns first (more efficient)
    if (SecurityValidator.containsDangerousCode(str)) {
      log.warn('Dangerous code pattern detected and removed from input');
    }

    const result = SecurityValidator.sanitizeInput(str);

    // Manage cache size to prevent memory leaks
    if (this.sanitizationCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.sanitizationCache.keys().next().value;
      if (firstKey) {
        this.sanitizationCache.delete(firstKey);
      }
    }
    this.sanitizationCache.set(str, result);

    return result;
  }

  private sanitizeNestedObject(obj: unknown, depth: number): Record<string, unknown> {
    if (depth <= 0 || !obj || typeof obj !== 'object') {
      return {};
    }

    const sanitized: Record<string, unknown> = {};
    const entries = Object.entries(obj as Record<string, unknown>);
    const limit = Math.min(entries.length, this.MAX_OBJECT_SIZE);

    for (let i = 0; i < limit; i++) {
      const [key, value] = entries[i];
      if (!SecurityValidator.isValidObjectKey(key)) {
        log.warn(`Invalid object key detected and skipped: ${key}`);
        continue;
      }

      sanitized[key] = this.sanitizeValue(value, depth);
    }

    return sanitized;
  }
}

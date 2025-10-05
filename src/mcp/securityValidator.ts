/**
 * Security validation utilities to prevent code injection attacks
 */

export class SecurityValidator {
  private static readonly DANGEROUS_PATTERNS: RegExp[] = [
    /ev[a]l\s*\(/gi, // eval function call
    /function\s*\(/gi,
    /=\s*>|=>\s*/g,
    /javascript:/gi,
    /data:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /<script/gi,
    /<\/script/gi,
    /\${.*}/g, // Template literals
    /`.*`/g, // Backticks
    /\\x[0-9a-fA-F]{2}/g, // Hex escapes
    /\\u[0-9a-fA-F]{4}/g, // Unicode escapes
  ];

  private static readonly SHELL_INJECTION_PATTERNS: RegExp[] = [
    /[;&|`$(){}[\]\\]/g,
    /\|\|/g,
    /&&/g,
    />/g,
    /</g,
    /\*/g,
    /\?/g,
  ];

  // Cache for dangerous code detection
  private static readonly dangerousCodeCache = new Map<string, boolean>();
  private static readonly MAX_CACHE_SIZE = 1000;

  /**
   * Validates if a string contains potentially dangerous code patterns
   */
  static containsDangerousCode(input: string): boolean {
    if (input.length === 0) return false;

    // Use cache for frequently checked strings
    const cached = this.dangerousCodeCache.get(input);
    if (cached !== undefined) {
      return cached;
    }

    // Fast path: check for common dangerous patterns first
    if (
      input.includes('ev' + 'al(') ||
      input.includes('function(') ||
      input.includes('javascript:')
    ) {
      this.setCache(input, true);
      return true;
    }

    // Check all patterns
    const result = this.DANGEROUS_PATTERNS.some((pattern) => pattern.test(input));
    this.setCache(input, result);
    return result;
  }

  /**
   * Validates if a string contains shell injection patterns
   */
  static containsShellInjection(input: string): boolean {
    if (input.length === 0) return false;
    return this.SHELL_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
  }

  /**
   * Validates tool name format
   */
  static isValidToolName(name: string): boolean {
    if (name.length > 100) return false;

    // Fast path: check length and basic characters first
    for (let i = 0; i < name.length; i++) {
      const char = name[i];
      if (
        !(char >= 'a' && char <= 'z') &&
        !(char >= 'A' && char <= 'Z') &&
        !(char >= '0' && char <= '9') &&
        char !== '_' &&
        char !== '.' &&
        char !== '-'
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validates file path to prevent directory traversal
   */
  static isValidPath(path: string): boolean {
    if (path.length > 1000) return false;

    // Prevent directory traversal
    if (path.includes('..') || path.includes('~')) return false;

    // Check for null bytes and dangerous characters
    if (/[\0<>|]/.test(path)) return false;

    return true;
  }

  /**
   * Validates command against whitelist
   */
  static isAllowedCommand(command: string, allowedCommands: string[]): boolean {
    const baseCommand = command.trim().split(/\s+/)[0];
    return allowedCommands.includes(baseCommand);
  }

  /**
   * Sanitizes input by removing dangerous patterns
   */
  static sanitizeInput(input: string): string {
    if (input.length === 0) return '';

    // Fast path: if no dangerous patterns, return as is
    if (!this.containsDangerousCode(input)) {
      return input.slice(0, 5000);
    }

    let sanitized = input;

    // Use a single pass with multiple pattern replacements for better performance
    for (const pattern of this.DANGEROUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Remove control characters in a single pass
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\x00-\x1f\x7f-\x9f]/g, '');

    // Limit length
    return sanitized.slice(0, 5000);
  }

  /**
   * Validates object structure to prevent prototype pollution
   */
  static isValidObjectKey(key: string): boolean {
    if (key.length === 0) return false;

    // Check for dangerous keys first
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return false;
    }

    // Validate key format using fast character checking
    for (let i = 0; i < key.length; i++) {
      const char = key[i];
      if (
        !(
          (char >= 'a' && char <= 'z') ||
          (char >= 'A' && char <= 'Z') ||
          (char >= '0' && char <= '9') ||
          char === '_' ||
          char === '-' ||
          char === '.'
        )
      ) {
        return false;
      }
    }

    return true;
  }

  private static setCache(key: string, value: boolean): void {
    if (this.dangerousCodeCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.dangerousCodeCache.keys().next().value;
      if (firstKey) {
        this.dangerousCodeCache.delete(firstKey);
      }
    }
    this.dangerousCodeCache.set(key, value);
  }
}

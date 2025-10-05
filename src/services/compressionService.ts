/**
 * Compression Service for AI Prompts
 * Optimizes data sent to AI models by removing unnecessary content
 * and restructuring information for better token efficiency.
 */

export class CompressionService {
  /**
   * Compress code by removing comments, excessive whitespace, and empty lines
   */
  public static compressCode(code: string, _language: string = 'typescript'): string {
    let compressed = code;

    // Remove single-line comments
    compressed = compressed.replace(/\/\/.*$/gm, '');

    // Remove multi-line comments but keep JSDoc for context
    compressed = compressed.replace(/\/\*(?!\*)[\s\S]*?\*\//g, '');

    // Remove excessive empty lines (more than 1)
    compressed = compressed.replace(/\n\s*\n\s*\n/g, '\n\n');

    // Remove trailing whitespace
    compressed = compressed.replace(/[ \t]+$/gm, '');

    // Remove leading whitespace while preserving relative indentation
    const lines = compressed.split('\n');
    const minIndent = lines
      .filter((line) => line.trim().length > 0)
      .reduce((min, line) => {
        const indent = line.match(/^(\s*)/)?.[1].length || 0;
        return Math.min(min, indent);
      }, Infinity);

    if (minIndent !== Infinity && minIndent > 0) {
      compressed = lines.map((line) => line.slice(minIndent)).join('\n');
    }

    return compressed.trim();
  }

  /**
   * Extract only critical rules from full rules object
   */
  public static compressRules(rulesJson: string): string {
    try {
      const rules = JSON.parse(rulesJson);

      // Create compact summary
      const compact: string[] = ['## CODE QUALITY RULES', ''];

      // Global rules
      if (rules.globalRules) {
        const g = rules.globalRules;
        if (g.architecture) {
          compact.push(`- Max file: ${g.architecture.maxFileLines} lines`);
          compact.push(`- Max function: ${g.architecture.maxFunctionLines} lines`);
          compact.push('- Modular architecture required');
        }
        if (g.codeQuality) {
          compact.push('- No hardcoded values or magic numbers');
          compact.push('- Descriptive naming (min 3 chars)');
        }
        if (g.security) {
          compact.push('- No hardcoded credentials/URLs');
          compact.push('- Validate all inputs');
          compact.push('- Use environment variables');
        }
        if (g.errorHandling) {
          compact.push('- Explicit error handling');
          compact.push('- No silent failures');
          compact.push('- Structured logging');
        }
        if (g.testing) {
          compact.push(`- Test coverage: ${g.testing.testCoverageMin}%+`);
        }
      }

      // Language-specific
      if (rules.languageSpecific) {
        compact.push('');
        compact.push('## LANGUAGE RULES');

        Object.entries(rules.languageSpecific).forEach(([lang, spec]: [string, any]) => {
          compact.push(`\n### ${lang.toUpperCase()}`);

          if (spec.style) {
            compact.push(
              `- Style: ${spec.style.standard}, max ${spec.style.maxLineLength} chars/line`
            );
          }
          if (spec.typing) {
            compact.push('- Type hints/annotations required');
          }
          if (spec.imports) {
            compact.push(`- ${spec.imports.absoluteOnly ? 'Absolute' : 'Relative'} imports`);
          }
          if (spec.forbidden?.functions) {
            compact.push(`- Forbidden: ${spec.forbidden.functions.join(', ')}`);
          }
        });
      }

      // Enforcement
      if (rules.enforcement) {
        compact.push('');
        compact.push(`## ENFORCEMENT: ${rules.enforcement.level}`);
        compact.push(`Minimum Score: ${rules.enforcement.scoreRequired}`);
      }

      return compact.join('\n');
    } catch {
      // If parsing fails, return truncated original
      return rulesJson.slice(0, 1000) + '\n... (truncated for brevity)';
    }
  }

  /**
   * Create a compact file summary with only essential info
   */
  public static createFileSummary(
    filePath: string,
    content: string,
    maxLines: number = 150
  ): string {
    const lines = content.split('\n');
    const compressed = this.compressCode(content);
    const compressedLines = compressed.split('\n');

    // If still too long after compression, take top and bottom
    if (compressedLines.length > maxLines) {
      const topLines = compressedLines.slice(0, Math.floor(maxLines * 0.7));
      const bottomLines = compressedLines.slice(-Math.floor(maxLines * 0.3));

      return [
        `// ${filePath} (${lines.length} lines, compressed to ${maxLines})`,
        ...topLines,
        '// ... (middle section omitted) ...',
        ...bottomLines,
      ].join('\n');
    }

    return `// ${filePath} (${lines.length} lines)\n${compressed}`;
  }

  /**
   * Calculate rough token count (approximation)
   */
  public static estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Optimize prompt structure for better AI comprehension with fewer tokens
   */
  public static optimizePrompt(sections: { rules: string; code: string; task: string }): string {
    const rulesTokens = this.estimateTokens(sections.rules);
    const codeTokens = this.estimateTokens(sections.code);
    // const totalTokens = rulesTokens + codeTokens + 200; // +200 for prompt structure

    // Build compact prompt
    const prompt = [
      '# CODE REVIEW',
      '',
      '## TASK',
      sections.task,
      '',
      '## RULES',
      this.compressRules(sections.rules),
      '',
      '## CODE',
      sections.code,
      '',
      '## OUTPUT',
      'Format: "Final Score: XX/100"',
      'Range: 0-100 (95+ = excellent, 70-94 = good, <70 = needs work)',
    ].join('\n');

    return prompt;
  }

  /**
   * Select most important files for analysis based on heuristics
   */
  public static prioritizeFiles(files: string[], maxFiles: number = 5): string[] {
    // Priority scoring
    const scores = files.map((file) => {
      let score = 0;
      const lower = file.toLowerCase();

      // High priority
      if (lower.includes('main.') || lower.includes('index.') || lower.includes('app.'))
        score += 10;
      if (lower.includes('config')) score += 8;
      if (lower.includes('service')) score += 7;
      if (lower.includes('controller')) score += 6;
      if (lower.includes('model')) score += 6;

      // Medium priority
      if (lower.includes('util')) score += 4;
      if (lower.includes('helper')) score += 4;
      if (lower.includes('handler')) score += 5;

      // Lower priority
      if (lower.includes('test')) score -= 5;
      if (lower.includes('spec')) score -= 5;
      if (lower.includes('.d.ts')) score -= 3;

      // Prefer shorter paths (likely more core)
      score -= file.split('/').length;

      return { file, score };
    });

    // Sort by score descending and take top N
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, maxFiles)
      .map((item) => item.file);
  }
}

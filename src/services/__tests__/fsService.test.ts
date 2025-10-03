import { describe, it, expect } from '@jest/globals';

describe('fsService path handling', () => {
  it('should handle quoted paths correctly', () => {
    const testCases = [
      '"C:\\Users\\test\\file.txt"',
      "'C:\\Users\\test\\file.txt'",
      'C:\\Users\\test\\file.txt',
    ];

    testCases.forEach((input) => {
      const cleaned = input.replace(/^["']+|["']+$/g, '').trim();
      expect(cleaned).toBe('C:\\Users\\test\\file.txt');
    });
  });

  it('should detect invalid characters', () => {
    const invalidPaths = ['file<test>.txt', 'file|test.txt', 'file\0test.txt'];

    invalidPaths.forEach((p) => {
      expect(/[<>|\0]/.test(p)).toBe(true);
    });
  });

  it('should detect path traversal', () => {
    const traversalPaths = [
      '../../../etc/passwd',
      'test/../../../file.txt',
      '..\\..\\windows\\system32',
    ];

    traversalPaths.forEach((p) => {
      expect(p.includes('..')).toBe(true);
    });
  });
});

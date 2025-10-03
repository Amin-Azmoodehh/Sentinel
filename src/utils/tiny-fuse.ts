// A tiny, dependency-free fuzzy search implementation inspired by Fuse.js

export interface TinyFuseOptions<T> {
  keys: (keyof T)[];
  threshold?: number;
}

function getByPath<T>(obj: T, path: keyof T): string {
  return String(obj[path] || '');
}

function calculateScore(term: string, value: string, threshold: number): number {
  const termLower = term.toLowerCase();
  const valueLower = value.toLowerCase();

  if (valueLower.includes(termLower)) {
    return 0; // Exact match
  }

  // Simple Levenshtein distance for fuzzy matching
  const d: number[][] = [];
  for (let i = 0; i <= term.length; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= value.length; j++) {
    d[0][j] = j;
  }
  for (let i = 1; i <= term.length; i++) {
    for (let j = 1; j <= value.length; j++) {
      const cost = term[i - 1] === value[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // Deletion
        d[i][j - 1] + 1, // Insertion
        d[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  const distance = d[term.length][value.length];
  const score = distance / value.length;

  return score < threshold ? score : 1;
}

export function tinyFuse<T>(list: T[], term: string, options: TinyFuseOptions<T>): T[] {
  if (!term) {
    return list;
  }

  const threshold = options.threshold ?? 0.6;
  const results: { item: T; score: number }[] = [];

  list.forEach((item) => {
    let bestScore = 1;

    options.keys.forEach((key) => {
      const value = getByPath(item, key);
      const score = calculateScore(term, value, threshold);
      if (score < bestScore) {
        bestScore = score;
      }
    });

    if (bestScore < threshold) {
      results.push({ item, score: bestScore });
    }
  });

  return results.sort((a, b) => a.score - b.score).map((r) => r.item);
}

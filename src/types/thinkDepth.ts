export interface ThinkDepthRequest {
  task: string;
  context?: string;
  think_depth: number;
}

export interface ThinkDepthResponse {
  plan?: string;
  design_decisions?: string[];
  artifacts?: Array<{ path: string; content: string }>;
  tests?: Array<{ name: string; steps: string[] }>;
  index_updates?: Array<{ file: string; summary: string }>;
  next_tasks?: string[];
}

export const THINK_DEPTH_LEVELS = {
  0: 'سریع - بدون طرح',
  1: 'طرح ۳-مرحلهای + کد حداقلی',
  2: 'طرح دقیق + چکلیست + کد',
  3: 'دو رویکرد + مقایسه + کد',
  4: 'برنامهریزی ابزار + تست واحد + بازبینی',
  5: 'ادغام پروژه + بهروزرسانی ایندکس + هماهنگی تسک',
  6: 'سناریوهای شکست + ریکاوری + معیارهای کیفیت + بنچمارک',
} as const;

export function calculateRiskLevel(task: string, context?: string): number {
  const highRiskKeywords = [
    'security',
    'auth',
    'database',
    'migration',
    'deploy',
    'امنیت',
    'دیتابیس',
  ];
  const mediumRiskKeywords = ['api', 'integration', 'refactor', 'یکپارچگی'];

  const text = `${task} ${context || ''}`.toLowerCase();

  if (highRiskKeywords.some((k) => text.includes(k))) return 6;
  if (mediumRiskKeywords.some((k) => text.includes(k))) return 4;
  return 2;
}

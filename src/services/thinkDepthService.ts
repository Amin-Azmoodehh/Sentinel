import { ThinkDepthRequest, ThinkDepthResponse, calculateRiskLevel } from '../types/thinkDepth.js';

export function processThinkDepth(req: ThinkDepthRequest): ThinkDepthResponse {
  const adjustedDepth = Math.max(req.think_depth, calculateRiskLevel(req.task, req.context));
  const response: ThinkDepthResponse = {};

  if (adjustedDepth >= 1) {
    response.plan = generatePlan(req.task, adjustedDepth);
  }

  if (adjustedDepth >= 3) {
    response.design_decisions = generateDesignDecisions(req.task);
  }

  if (adjustedDepth >= 4) {
    response.tests = generateTests(req.task);
  }

  if (adjustedDepth >= 5) {
    response.index_updates = generateIndexUpdates(req.task);
    response.next_tasks = generateNextTasks(req.task);
  }

  return response;
}

function generatePlan(_task: string, depth: number): string {
  const steps = depth <= 1 ? 3 : depth <= 3 ? 5 : 8;
  return `طرح ${steps}-مرحلهای برای: ${_task}`;
}

function generateDesignDecisions(_task: string): string[] {
  return [
    `رویکرد A: پیادهسازی مستقیم - سریع اما محدود`,
    `رویکرد B: معماری قابل توسعه - زمانبر اما انعطافپذیر`,
    `انتخاب: بر اساس ریسک و زمان`,
  ];
}

function generateTests(_task: string): Array<{ name: string; steps: string[] }> {
  return [
    {
      name: 'تست واحد اصلی',
      steps: ['ورودی معتبر', 'ورودی نامعتبر', 'حالت مرزی'],
    },
  ];
}

function generateIndexUpdates(_task: string): Array<{ file: string; summary: string }> {
  return [{ file: 'index.yaml', summary: 'بهروزرسانی ماژول جدید' }];
}

function generateNextTasks(_task: string): string[] {
  return ['تست یکپارچگی', 'بهروزرسانی مستندات'];
}

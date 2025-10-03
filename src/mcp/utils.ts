import { McpResponse, McpError } from './types.js';

export const successResponse = <T>(data: T): McpResponse<T> => ({ success: true, data });

export const errorResponse = (error: unknown): McpResponse => {
  if (error instanceof McpError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        details: error.details,
      },
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  return {
    success: false,
    error: {
      message,
      code: 'ERR_INTERNAL_SERVER',
    },
  };
};

export const ensureObject = (value: unknown, field: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new McpError(field + ' must be an object');
  }
  return value as Record<string, unknown>;
};

export const ensureString = (value: unknown, field: string, allowEmpty = false): string => {
  if (typeof value !== 'string') {
    throw new McpError(field + ' must be a string');
  }
  const trimmed = value.trim();
  if (!allowEmpty && trimmed.length === 0) {
    throw new McpError(field + ' must be a non-empty string');
  }
  return trimmed;
};

export const ensureNumber = (value: unknown, field: string): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new McpError(field + ' must be a finite number');
  }
  return parsed;
};

export const asOptionalNumber = (value: unknown, field: string): number | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  return ensureNumber(value, field);
};

export const ensureStringArray = (value: unknown, field: string): string[] => {
  if (!Array.isArray(value)) {
    throw new McpError(field + ' must be an array of strings');
  }
  return value.map((entry, index) => ensureString(entry, field + '[' + index + ']'));
};

export const parsePriority = (value: unknown): 'high' | 'med' | 'low' | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const normalized = ensureString(value, 'priority').toLowerCase();
  const priorities: ('high' | 'med' | 'low')[] = ['high', 'med', 'low'];
  if (!priorities.includes(normalized as 'high' | 'med' | 'low')) {
    throw new McpError('priority must be one of: high, med, low');
  }
  return normalized as 'high' | 'med' | 'low';
};

export const parseStatus = (value: unknown, field = 'status'): 'open' | 'done' | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const normalized = ensureString(value, field).toLowerCase();
  const statuses: ('open' | 'done')[] = ['open', 'done'];
  if (!statuses.includes(normalized as 'open' | 'done')) {
    throw new McpError(field + ' must be one of: open, done');
  }
  return normalized as 'open' | 'done';
};

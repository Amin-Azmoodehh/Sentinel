import { McpError } from './types.js';
import * as fsService from '../services/fsService.js';
import * as taskService from '../services/taskService.js';

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

export const ensureBoolean = (value: unknown, field: string): boolean => {
  if (value === true || value === false) {
    return value;
  }
  if (value === 'true' || value === '1') {
    return true;
  }
  if (value === 'false' || value === '0') {
    return false;
  }
  throw new McpError(field + ' must be a boolean');
};

const SUPPORTED_ENCODINGS: fsService.FileEncoding[] = [
  'utf8',
  'utf16le',
  'latin1',
  'ascii',
  'hex',
  'base64',
  'ucs2',
  'binary',
];

export const ensureEncoding = (value: unknown, field: string): fsService.FileEncoding => {
  const normalized = ensureString(value, field).toLowerCase().replace(/-/g, '');
  if (!SUPPORTED_ENCODINGS.includes(normalized as fsService.FileEncoding)) {
    throw new McpError(field + ' must be one of: ' + SUPPORTED_ENCODINGS.join(', '));
  }
  return normalized as fsService.FileEncoding;
};

export const parsePriority = (value: unknown): taskService.TaskPriority | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const normalized = ensureString(value, 'priority').toLowerCase();
  const priorities: taskService.TaskPriority[] = ['high', 'med', 'low'];
  if (!priorities.includes(normalized as taskService.TaskPriority)) {
    throw new McpError('priority must be one of: high, med, low');
  }
  return normalized as taskService.TaskPriority;
};

export const parseStatus = (
  value: unknown,
  field = 'status'
): taskService.TaskStatus | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const normalized = ensureString(value, field).toLowerCase();
  const statuses: taskService.TaskStatus[] = ['open', 'in-progress', 'review', 'done', 'blocked'];
  if (!statuses.includes(normalized as taskService.TaskStatus)) {
    throw new McpError(`${field} must be one of: ${statuses.join(', ')}`);
  }
  return normalized as taskService.TaskStatus;
};

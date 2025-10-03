import crypto from 'node:crypto';

export const sha256 = (input: Buffer | string): string => {
  const buffer = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

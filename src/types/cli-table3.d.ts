declare module 'cli-table3' {
  interface TableOptions {
    head?: string[];
    style?: Record<string, unknown>;
  }

  export default class Table<T extends unknown[] = unknown[]> {
    constructor(options?: TableOptions);
    push(row: T): void;
    toString(): string;
  }
}

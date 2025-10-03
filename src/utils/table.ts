import Table from 'cli-table3';
import chalk from 'chalk';

const ascii = process.env.ST_ASCII === '1';

export type TableRow = (string | number)[];

export interface TableOptions {
  head: string[];
  rows: TableRow[];
}

export const renderTable = ({ head, rows }: TableOptions): string => {
  const table = new Table({
    head: head.map((column) => (ascii ? column : chalk.bold(column))),
    style: {
      head: ascii ? [] : ['cyan'],
      border: ascii ? ['grey'] : ['grey'],
      compact: true,
    },
  });
  rows.forEach((row) => table.push(row));
  return table.toString();
};

import chalk from 'chalk';

const asciiFallback = process.env.ST_ASCII === '1';
const forceStderr = process.env.ST_FORCE_STDERR === '1';
const isCliGateRun = (): boolean => process.env.ST_COMMAND === 'gate-runner';

const brandPrimary = chalk.hex('#7f5af0');
const brandAccent = chalk.hex('#2cb1bc');
const successColor = chalk.hex('#2dd36f');
const warningColor = chalk.hex('#ffa62b');
const dangerColor = chalk.hex('#ff5c60');

const stripAnsi = (value: string): string => {
  const esc = String.fromCharCode(27);
  const ansiPattern = new RegExp(`${esc}\\[[0-9;]*m`, 'g');
  return value.replace(ansiPattern, '');
};

const writeLine = (message: string, level: 'info' | 'success' | 'warn' | 'error' | 'raw') => {
  const useErrorStream = forceStderr || level === 'warn' || level === 'error';
  const output = message.endsWith('\n') ? message : message + '\n';
  if (useErrorStream) {
    process.stderr.write(output);
  } else {
    process.stdout.write(output);
  }
};

const symbols = asciiFallback
  ? {
      info: '[i]',
      success: '[+]',
      warn: '[*]',
      error: '[x]',
      rocket: '[>]',
      gear: '[#]',
      file: '[f]',
      task: '[t]',
    }
  : {
      info: 'ℹ',
      success: '✔',
      warn: '⚠',
      error: '✖',
      rocket: '🚀',
      gear: '⚙️',
      file: '📁',
      task: '📋',
    };

export type SummaryStatus = 'success' | 'fail' | 'warn' | 'info';

export interface SummaryRow {
  label: string;
  value?: string;
  status?: SummaryStatus;
}

export const log = {
  info: (message: string): void => {
    writeLine(`${chalk.cyan(symbols.info)} ${message}`, 'info');
  },
  success: (message: string): void => {
    writeLine(`${chalk.green(symbols.success)} ${message}`, 'success');
  },
  warn: (message: string): void => {
    writeLine(`${chalk.yellow(symbols.warn)} ${message}`, 'warn');
  },
  error: (message: string): void => {
    writeLine(`${chalk.red(symbols.error)} ${message}`, 'error');
  },
  raw: (message: string): void => {
    writeLine(message, 'raw');
  },
  provider: (message: string): void => {
    writeLine(`${chalk.magenta('🤖')} ${message}`, 'info');
  },
  file: (message: string): void => {
    writeLine(`${chalk.blue(symbols.file)} ${message}`, 'info');
  },
  task: (message: string): void => {
    writeLine(`${chalk.cyan(symbols.task)} ${message}`, 'info');
  },
  section: (title: string): void => {
    const plain = title.toUpperCase();
    if (asciiFallback || !isCliGateRun()) {
      writeLine(`\n== ${plain} ==`, 'info');
      return;
    }
    const icon = brandAccent('◆');
    const label = chalk.bold.white(plain);
    const underline = brandPrimary('─'.repeat(stripAnsi(label).length + 4));
    const block = `\n${icon} ${label}\n${underline}`;
    writeLine(block, 'info');
  },
  banner: (title: string, subtitle?: string, variant: SummaryStatus = 'info'): void => {
    const plainTitle = title.toUpperCase();
    const plainSubtitle = subtitle ?? '';
    if (asciiFallback || !isCliGateRun()) {
      const lines = [`\n== ${plainTitle} ==`];
      if (subtitle) {
        lines.push(subtitle);
      }
      writeLine(lines.join('\n'), 'info');
      return;
    }

    const palettes: Record<
      SummaryStatus,
      {
        border: (text: string) => string;
        title: (text: string) => string;
        subtitle: (text: string) => string;
      }
    > = {
      info: {
        border: (text) => brandPrimary(text),
        title: (text) => brandAccent.bold(text),
        subtitle: (text) => chalk.white(text),
      },
      success: {
        border: (text) => successColor(text),
        title: (text) => chalk.white.bold(text),
        subtitle: (text) => successColor(text),
      },
      warn: {
        border: (text) => warningColor(text),
        title: (text) => chalk.white.bold(text),
        subtitle: (text) => warningColor(text),
      },
      fail: {
        border: (text) => dangerColor(text),
        title: (text) => chalk.white.bold(text),
        subtitle: (text) => dangerColor(text),
      },
    };
    const palette = palettes[variant] ?? palettes.info;
    const content = [plainTitle];
    if (subtitle) {
      content.push(plainSubtitle);
    }
    const innerWidth = Math.max(...content.map((line) => line.length)) + 4;
    const center = (text: string) => {
      const padding = innerWidth - text.length;
      const left = Math.floor(padding / 2);
      const right = padding - left;
      return ' '.repeat(left + 1) + text + ' '.repeat(right + 1);
    };

    const top = palette.border(`\n╔${'═'.repeat(innerWidth)}╗`);
    const mid = palette.border('║') + palette.title(center(plainTitle)) + palette.border('║');
    const lines = [top, mid];
    if (subtitle) {
      lines.push(
        palette.border('║') + palette.subtitle(center(plainSubtitle)) + palette.border('║')
      );
    }
    lines.push(palette.border(`╚${'═'.repeat(innerWidth)}╝`));
    writeLine(lines.join('\n'), 'info');
  },
  attempt: (current: number, total: number): void => {
    const label = `Attempt ${current}/${total}`;
    if (asciiFallback || !isCliGateRun()) {
      writeLine(`\n> ${label}`, 'info');
      return;
    }
    const line = `\n${brandAccent('⚙️')} ${chalk.bold.white(label)}`;
    writeLine(line, 'info');
  },
  summary: (title: string, rows: SummaryRow[]): void => {
    if (rows.length === 0) {
      return;
    }

    if (asciiFallback || !isCliGateRun()) {
      const lines = [`\n${title.toUpperCase()}`];
      for (const row of rows) {
        lines.push(`- ${row.label}${row.value ? `: ${row.value}` : ''}`);
      }
      writeLine(lines.join('\n'), 'info');
      return;
    }

    const header = `\n${brandPrimary('┏━━')} ${brandAccent.bold(title.toUpperCase())}`;
    const statusIcons: Record<SummaryStatus, { icon: string; color: (text: string) => string }> = {
      success: { icon: '✔', color: successColor },
      fail: { icon: '✖', color: dangerColor },
      warn: { icon: '⚠', color: warningColor },
      info: { icon: '•', color: brandAccent },
    };
    const lines = rows.map((row) => {
      const status = row.status ?? 'info';
      const { icon, color } = statusIcons[status];
      const parts = [color(icon), chalk.white.bold(row.label)];
      if (row.value) {
        parts.push(chalk.gray(`· ${row.value}`));
      }
      return parts.join(' ');
    });
    const footer = brandPrimary('┗' + '━'.repeat(Math.max(stripAnsi(header).length - 1, 3)));
    writeLine([header, ...lines, footer].join('\n'), 'info');
  },
  rocket: (message: string): void => {
    writeLine(`${chalk.green(symbols.rocket)} ${message}`, 'success');
  },
};

export const formatHeading = (title: string): string => {
  const border = '═'.repeat(title.length + 4);
  return chalk.bold.cyan(`\n╔${border}╗\n║  ${title.toUpperCase()}  ║\n╚${border}╝`);
};

export const formatBox = (content: string[], title?: string): string => {
  const maxWidth = Math.max(...content.map((line) => line.length), title?.length || 0) + 4;
  const border = '─'.repeat(maxWidth - 2);

  let result = chalk.cyan(`┌${border}┐\n`);

  if (title) {
    const padding = Math.max(0, maxWidth - title.length - 4);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    result +=
      chalk.cyan('│ ') + chalk.bold.white(title) + ' '.repeat(rightPad) + chalk.cyan(' │\n');
    result += chalk.cyan(`├${border}┤\n`);
  }

  content.forEach((line) => {
    const padding = maxWidth - line.length - 4;
    result += chalk.cyan('│ ') + line + ' '.repeat(Math.max(0, padding)) + chalk.cyan(' │\n');
  });

  result += chalk.cyan(`└${border}┘`);
  return result;
};

export const formatTable = (headers: string[], rows: string[][]): string => {
  const colWidths = headers.map((header, i) =>
    Math.max(header.length, ...rows.map((row) => (row[i] || '').length))
  );

  const separator = '─'.repeat(colWidths.reduce((sum, width) => sum + width + 3, 1));

  let result = chalk.cyan(`┌${separator}┐\n`);

  // Headers
  result += chalk.cyan('│ ');
  headers.forEach((header, i) => {
    result += chalk.bold.white(header.padEnd(colWidths[i]));
    if (i < headers.length - 1) result += chalk.cyan(' │ ');
  });
  result += chalk.cyan(' │\n');

  result += chalk.cyan(`├${separator}┤\n`);

  // Rows
  rows.forEach((row) => {
    result += chalk.cyan('│ ');
    row.forEach((cell, i) => {
      result += (cell || '').padEnd(colWidths[i]);
      if (i < row.length - 1) result += chalk.cyan(' │ ');
    });
    result += chalk.cyan(' │\n');
  });

  result += chalk.cyan(`└${separator}┘`);
  return result;
};

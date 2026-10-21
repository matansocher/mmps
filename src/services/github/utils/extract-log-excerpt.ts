import type { JobLogExcerpt } from '../types';

type ExtractLogExcerptOptions = {
  readonly tailLines?: number;
  readonly contextLines?: number;
  readonly maxChars?: number;
  readonly maxErrorLines?: number;
};

const TIMESTAMP_PREFIX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z ?/;
// eslint-disable-next-line no-control-regex
const ANSI_CODES = /\x1b\[[0-9;]*[A-Za-z]/g;
const ERROR_MARKER = '##[error]';
const GAP_MARKER = '…';
const TRUNCATED_MARKER = '…truncated…\n';

function cleanLine(line: string): string {
  return line
    .replace(/^\uFEFF/, '')
    .replace(TIMESTAMP_PREFIX, '')
    .replace(ANSI_CODES, '')
    .trimEnd();
}

export function extractLogExcerpt(rawLog: string, options: ExtractLogExcerptOptions = {}): Omit<JobLogExcerpt, 'jobId'> {
  const { tailLines = 80, contextLines = 5, maxChars = 8000, maxErrorLines = 30 } = options;
  const lines = rawLog.split(/\r?\n/).map(cleanLine);
  while (lines.length && !lines[lines.length - 1]) lines.pop();

  const errorIndexes = lines.map((line, index) => (line.includes(ERROR_MARKER) ? index : -1)).filter((index) => index >= 0);

  const included = new Set<number>();
  errorIndexes.forEach((errorIndex) => {
    for (let i = Math.max(0, errorIndex - contextLines); i <= errorIndex; i++) included.add(i);
  });
  for (let i = Math.max(0, lines.length - tailLines); i < lines.length; i++) included.add(i);

  const sortedIndexes = [...included].sort((a, b) => a - b);
  const excerptLines: string[] = [];
  sortedIndexes.forEach((index, position) => {
    const previous = sortedIndexes[position - 1];
    if ((position === 0 && index > 0) || (previous !== undefined && index - previous > 1)) excerptLines.push(GAP_MARKER);
    excerptLines.push(lines[index]);
  });

  let excerpt = excerptLines.join('\n');
  const truncated = excerpt.length > maxChars;
  if (truncated) excerpt = TRUNCATED_MARKER + excerpt.slice(excerpt.length - maxChars);

  return {
    totalLines: lines.length,
    errorLines: errorIndexes.slice(0, maxErrorLines).map((index) => lines[index].replace(ERROR_MARKER, '').trim()),
    excerpt,
    truncated,
  };
}

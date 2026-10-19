import { extractLogExcerpt } from './extract-log-excerpt';

const TSC_FAILURE_LOG = [
  '\uFEFF2026-10-18T10:00:00.0000000Z ##[group]Run npm ci',
  '2026-10-18T10:00:01.0000000Z added 900 packages',
  '2026-10-18T10:00:02.0000000Z ##[endgroup]',
  '2026-10-18T10:00:03.0000000Z ##[group]Run npm run build',
  '2026-10-18T10:00:04.0000000Z > coach-web@1.0.0 build',
  '2026-10-18T10:00:05.0000000Z > tsc -b && vite build',
  "2026-10-18T10:00:06.0000000Z ##[error]src/pages/DashboardPage.tsx(314,32): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.",
  '2026-10-18T10:00:07.0000000Z npm error Lifecycle script `build` failed with error:',
  '2026-10-18T10:00:08.0000000Z ##[error]Process completed with exit code 1.',
  '',
].join('\n');

describe('extractLogExcerpt()', () => {
  test('should surface tsc error lines without timestamps', () => {
    const result = extractLogExcerpt(TSC_FAILURE_LOG, { tailLines: 2, contextLines: 1 });
    expect(result.errorLines).toEqual([
      "src/pages/DashboardPage.tsx(314,32): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.",
      'Process completed with exit code 1.',
    ]);
    expect(result.totalLines).toEqual(9);
    expect(result.truncated).toEqual(false);
    expect(result.excerpt).toEqual(
      [
        '…',
        '> tsc -b && vite build',
        "##[error]src/pages/DashboardPage.tsx(314,32): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.",
        'npm error Lifecycle script `build` failed with error:',
        '##[error]Process completed with exit code 1.',
      ].join('\n'),
    );
  });

  test.each([
    { name: 'tail only when there are no errors', log: 'a\nb\nc\nd', tailLines: 2, expected: '…\nc\nd' },
    { name: 'whole log when tail covers it', log: 'a\nb', tailLines: 5, expected: 'a\nb' },
    { name: 'gap between error block and tail', log: 'x\n##[error]boom\ny\nz\nw', tailLines: 1, expected: 'x\n##[error]boom\n…\nw' },
  ])('should return $name', ({ log, tailLines, expected }) => {
    expect(extractLogExcerpt(log, { tailLines, contextLines: 1 }).excerpt).toEqual(expected);
  });

  test('should strip ANSI codes', () => {
    expect(extractLogExcerpt('\x1b[31mred\x1b[0m text').excerpt).toEqual('red text');
  });

  test('should keep the end of the excerpt when exceeding maxChars', () => {
    const result = extractLogExcerpt('0123456789\nabcdefghij', { maxChars: 5 });
    expect(result.truncated).toEqual(true);
    expect(result.excerpt).toEqual('…truncated…\nfghij');
  });

  test('should cap the number of error lines', () => {
    const log = Array.from({ length: 5 }, (_, i) => `##[error]e${i}`).join('\n');
    expect(extractLogExcerpt(log, { maxErrorLines: 2 }).errorLines).toEqual(['e0', 'e1']);
  });
});

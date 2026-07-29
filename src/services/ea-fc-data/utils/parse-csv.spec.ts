import { describe, expect, it } from 'vitest';
import { parseCsv } from './parse-csv';

describe('parseCsv()', () => {
  it('parses a simple csv into keyed objects', () => {
    const rows = parseCsv('a,b,c\n1,2,3\n4,5,6');
    expect(rows).toEqual([
      { a: '1', b: '2', c: '3' },
      { a: '4', b: '5', c: '6' },
    ]);
  });

  it('handles quoted fields containing commas', () => {
    const rows = parseCsv('id,positions\n231747,"ST, LW, LM"');
    expect(rows).toEqual([{ id: '231747', positions: 'ST, LW, LM' }]);
  });

  it('handles escaped double-quotes inside quoted fields', () => {
    const rows = parseCsv('name\n"He said ""hi"""');
    expect(rows).toEqual([{ name: 'He said "hi"' }]);
  });

  it('handles \\r\\n line endings', () => {
    const rows = parseCsv('a,b\r\n1,2\r\n3,4');
    expect(rows).toEqual([
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ]);
  });

  it('handles a trailing row without a newline', () => {
    const rows = parseCsv('a,b\n1,2');
    expect(rows).toEqual([{ a: '1', b: '2' }]);
  });

  it('returns an empty array for empty input', () => {
    expect(parseCsv('')).toEqual([]);
  });
});

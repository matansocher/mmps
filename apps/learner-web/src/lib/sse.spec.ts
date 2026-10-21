import { describe, expect, it } from 'vitest';
import { createSseParser } from './sse';

describe('createSseParser()', () => {
  it('parses named events with JSON data', () => {
    const parser = createSseParser();
    expect(parser.push('event: delta\ndata: {"text":"Hi"}\n\n')).toEqual([{ event: 'delta', data: '{"text":"Hi"}' }]);
  });

  it('buffers events split across chunks', () => {
    const parser = createSseParser();
    expect(parser.push('event: del')).toEqual([]);
    expect(parser.push('ta\ndata: {"text":"a"}\n')).toEqual([]);
    expect(parser.push('\nevent: done\ndata: {}\n\n')).toEqual([
      { event: 'delta', data: '{"text":"a"}' },
      { event: 'done', data: '{}' },
    ]);
  });

  it('defaults to the message event, joins multi-line data and ignores comments', () => {
    const parser = createSseParser();
    expect(parser.push(': ping\n\ndata: one\ndata: two\n\n')).toEqual([{ event: 'message', data: 'one\ntwo' }]);
  });

  it('handles CRLF line endings', () => {
    const parser = createSseParser();
    expect(parser.push('event: done\r\ndata: x\r\n\r\n')).toEqual([{ event: 'done', data: 'x' }]);
  });

  it('flushes a trailing unterminated event', () => {
    const parser = createSseParser();
    expect(parser.push('event: done\ndata: x')).toEqual([]);
    expect(parser.flush()).toEqual([{ event: 'done', data: 'x' }]);
  });
});

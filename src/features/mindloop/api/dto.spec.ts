import { describe, expect, it } from 'vitest';
import { parseRecordResultBody, parseSyncBody } from './dto';

describe('parseRecordResultBody()', () => {
  it('accepts a full run payload with runId and completion timestamp', () => {
    const body = { runId: 'abc-123', gameId: 'memory-match', score: 42.6, at: '2026-01-01T00:00:00.000Z' };
    expect(parseRecordResultBody(body)).toEqual({ runId: 'abc-123', gameId: 'memory-match', score: 43, at: '2026-01-01T00:00:00.000Z' });
  });

  it('rejects a payload missing runId', () => {
    const body = { gameId: 'memory-match', score: 10, at: '2026-01-01T00:00:00.000Z' };
    expect(parseRecordResultBody(body)).toBeNull();
  });

  it('rejects a payload with an invalid timestamp', () => {
    const body = { runId: 'abc', gameId: 'memory-match', score: 10, at: 'not-a-date' };
    expect(parseRecordResultBody(body)).toBeNull();
  });
});

describe('parseSyncBody()', () => {
  it('keeps a client runId when present', () => {
    const data = parseSyncBody({
      bestScores: {},
      favorites: [],
      history: [{ runId: 'run-1', gameId: 'memory-match', score: 5, at: '2026-01-01T00:00:00.000Z' }],
    });
    expect(data?.history[0].runId).toBe('run-1');
  });

  it('derives a stable legacy runId for entries without one', () => {
    const data = parseSyncBody({
      bestScores: {},
      favorites: [],
      history: [{ gameId: 'memory-match', score: 5, at: '2026-01-01T00:00:00.000Z' }],
    });
    expect(data?.history[0].runId).toBe('legacy:memory-match@2026-01-01T00:00:00.000Z');
  });
});

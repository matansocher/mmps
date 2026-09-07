import { describe, expect, it } from 'vitest';
import { legacyRunId } from '../legacy';
import type { MindloopPlayEntry } from '../types';
import { mergeHistory } from './player.repository';

const entry = (e: Partial<MindloopPlayEntry> & { gameId: string; at: string; score: number }): MindloopPlayEntry =>
  ({ runId: e.runId as string, gameId: e.gameId, score: e.score, at: e.at, ...(e.receivedAt ? { receivedAt: e.receivedAt } : {}) }) as MindloopPlayEntry;

describe('mergeHistory()', () => {
  it('keeps stored legacy entries that lack a runId (server-only pre-upgrade history)', () => {
    const stored = [{ gameId: 'memory-match', score: 5, at: '2026-01-01T00:00:00.000Z' } as unknown as MindloopPlayEntry];
    const incoming = [entry({ runId: 'run-2', gameId: 'reaction', score: 9, at: '2026-01-02T00:00:00.000Z' })];

    const merged = mergeHistory(incoming, stored);

    expect(merged).toHaveLength(2);
    const legacy = merged.find((e) => e.gameId === 'memory-match');
    expect(legacy?.runId).toBe(legacyRunId('memory-match', '2026-01-01T00:00:00.000Z'));
  });

  it('dedupes a stored legacy entry against an incoming entry with the same derived legacy runId', () => {
    const stored = [{ gameId: 'memory-match', score: 5, at: '2026-01-01T00:00:00.000Z' } as unknown as MindloopPlayEntry];
    const incoming = [entry({ runId: legacyRunId('memory-match', '2026-01-01T00:00:00.000Z'), gameId: 'memory-match', score: 5, at: '2026-01-01T00:00:00.000Z' })];

    const merged = mergeHistory(incoming, stored);

    expect(merged).toHaveLength(1);
  });

  it('merges mixed old/new entries newest-first without dropping either', () => {
    const stored = [
      { gameId: 'memory-match', score: 5, at: '2026-01-01T00:00:00.000Z' } as unknown as MindloopPlayEntry,
      entry({ runId: 'run-old', gameId: 'reaction', score: 3, at: '2026-01-02T00:00:00.000Z' }),
    ];
    const incoming = [entry({ runId: 'run-new', gameId: 'sequence', score: 8, at: '2026-01-03T00:00:00.000Z' })];

    const merged = mergeHistory(incoming, stored);

    expect(merged.map((e) => e.gameId)).toEqual(['sequence', 'reaction', 'memory-match']);
  });

  it('drops malformed stored entries missing required fields', () => {
    const stored = [{ gameId: 'memory-match' } as unknown as MindloopPlayEntry];
    const incoming = [entry({ runId: 'run-1', gameId: 'reaction', score: 9, at: '2026-01-02T00:00:00.000Z' })];

    const merged = mergeHistory(incoming, stored);

    expect(merged).toHaveLength(1);
    expect(merged[0].runId).toBe('run-1');
  });
});

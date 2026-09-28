import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addProgressRun, EMPTY_PROGRESS, progressCounts } from '@shared/mindloop/progress';
import type { MindloopPlayerDocument } from '../types';
import { mergeSync } from './player.repository';

const mocks = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock('@core/mongo', () => ({ getMongoCollection: () => ({ findOneAndUpdate: mocks.update }) }));
const run = { runId: 'modern-run', gameId: 'grid-recall', score: 20, at: '2026-09-28T01:00:00Z', day: '2026-09-28' };
let player: MindloopPlayerDocument;
beforeEach(() => {
  player = { _id: 1, bestScores: {}, favorites: [], history: [], revision: 0, createdAt: new Date(), updatedAt: new Date() };
  mocks.update.mockReset().mockImplementation(async (_query, update) => {
    if (update.$setOnInsert) return player;
    player = { ...player, ...update.$set, revision: player.revision + 1 };
    return player;
  });
});
describe('legacy client snapshot compatibility', () => {
  it('does not recount modern runs echoed by an old client or duplicate incoming runs', async () => {
    player = { ...player, history: [run], progress: addProgressRun(EMPTY_PROGRESS, 'phone', run) };
    const oldRun = { ...run, runId: 'old-client-run' };
    const snapshot = { bestScores: {}, favorites: [], history: [run, oldRun, oldRun] };
    await mergeSync(1, snapshot);
    const result = await mergeSync(1, snapshot);
    expect(progressCounts(result.progress!).games['grid-recall']).toBe(2);
    expect(result.history).toHaveLength(2);
  });
  it('preserves legacy score awards even when the original run has left history', async () => {
    const result = await mergeSync(1, { bestScores: { 'grid-recall': 1500 }, favorites: [], history: [] });
    expect(result.progress?.awards.elite).toBeTruthy();
    expect(result.progress?.awards['high-scorer']).toBeTruthy();
  });
});

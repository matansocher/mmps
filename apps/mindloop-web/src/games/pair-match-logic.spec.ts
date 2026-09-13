import { describe, expect, it } from 'vitest';
import { advancePairMatchBoard, createPairMatchProgress, getPairMatchBoardConfig, recordPairMatchMove, scorePairMatch } from './pair-match-logic';
import type { PairMatchProgress } from './pair-match-logic';

function completeBoard(progress: PairMatchProgress): PairMatchProgress {
  const pairs = getPairMatchBoardConfig(progress.boardIndex).pairs;
  let next = progress;
  for (let i = progress.boardMatches; i < pairs; i++) next = recordPairMatchMove(next, true);
  return next;
}

describe('PairMatch progression', () => {
  it('starts a replay with empty totals and four pairs', () => {
    expect(createPairMatchProgress()).toEqual({
      boardIndex: 0, boardMatches: 0, totalMatches: 0, totalMoves: 0, boardsCleared: 0, boardBonus: 0,
    });
    expect(getPairMatchBoardConfig(0).pairs).toEqual(4);
  });

  it('grows successive decks from four to six to eight pairs without an ending board', () => {
    expect([0, 1, 2, 3, 20].map((index) => getPairMatchBoardConfig(index).pairs)).toEqual([4, 6, 8, 8, 8]);
  });

  it('shortens later mismatch reveals without making cards unreadably brief', () => {
    expect(getPairMatchBoardConfig(3).mismatchMs).toBeLessThan(getPairMatchBoardConfig(2).mismatchMs);
    expect(getPairMatchBoardConfig(20).mismatchMs).toEqual(450);
    expect(getPairMatchBoardConfig(20).clearBonus).toBeGreaterThan(getPairMatchBoardConfig(3).clearBonus);
  });

  it('records the final pair and board bonus immediately, before the new-board animation', () => {
    const completed = completeBoard(createPairMatchProgress());
    expect(completed).toEqual({
      boardIndex: 0, boardMatches: 4, totalMatches: 4, totalMoves: 4, boardsCleared: 1, boardBonus: 100,
    });
    expect(scorePairMatch(completed)).toEqual(480);
    expect(recordPairMatchMove(completed, true)).toBe(completed);
    expect(recordPairMatchMove(completed, false)).toBe(completed);
  });

  it('keeps cumulative totals and score on transition without awarding the same board twice', () => {
    const completed = completeBoard(createPairMatchProgress());
    const next = advancePairMatchBoard(completed);
    expect(next).toEqual({ ...completed, boardIndex: 1, boardMatches: 0 });
    expect(scorePairMatch(next)).toEqual(scorePairMatch(completed));
    expect(advancePairMatchBoard(next)).toBe(next);
    const second = completeBoard(next);
    expect(second.totalMatches).toEqual(10);
    expect(second.totalMoves).toEqual(10);
    expect(second.boardsCleared).toEqual(2);
    expect(second.boardBonus).toEqual(250);
    expect(scorePairMatch(second)).toEqual(1200);
  });

  it('keeps partial-board points if the clock expires, with no remaining-time bonus', () => {
    const secondBoard = advancePairMatchBoard(completeBoard(createPairMatchProgress()));
    const matched = recordPairMatchMove(secondBoard, true);
    const missed = recordPairMatchMove(matched, false);
    expect(scorePairMatch(missed)).toEqual(570);
    expect(missed.boardMatches).toEqual(1);
    expect(missed.totalMatches).toEqual(5);
    expect(missed.totalMoves).toEqual(6);
    expect(missed.boardsCleared).toEqual(1);
    expect(missed.boardBonus).toEqual(100);
    expect(advancePairMatchBoard(missed)).toBe(missed);
  });

  it('leaves input progress immutable and clamps scores at zero', () => {
    const initial = createPairMatchProgress();
    const missed = recordPairMatchMove(initial, false);
    expect(initial.totalMoves).toEqual(0);
    expect(missed.totalMoves).toEqual(1);
    expect(scorePairMatch(missed)).toEqual(0);
    expect(createPairMatchProgress()).toEqual(initial);
  });
});

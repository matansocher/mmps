export type PairMatchProgress = {
  readonly boardIndex: number;
  readonly boardMatches: number;
  readonly totalMatches: number;
  readonly totalMoves: number;
  readonly boardsCleared: number;
  readonly boardBonus: number;
};

export function getPairMatchBoardConfig(boardIndex: number) {
  return {
    pairs: Math.min(8, 4 + boardIndex * 2),
    mismatchMs: Math.max(450, 750 - Math.max(0, boardIndex - 2) * 75),
    clearBonus: 100 + boardIndex * 50,
  };
}

export function createPairMatchProgress(): PairMatchProgress {
  return { boardIndex: 0, boardMatches: 0, totalMatches: 0, totalMoves: 0, boardsCleared: 0, boardBonus: 0 };
}

export function recordPairMatchMove(progress: PairMatchProgress, matched: boolean): PairMatchProgress {
  const config = getPairMatchBoardConfig(progress.boardIndex);
  if (progress.boardMatches >= config.pairs) return progress;
  const boardMatches = progress.boardMatches + Number(matched);
  const cleared = boardMatches === config.pairs;
  return {
    ...progress,
    boardMatches,
    totalMatches: progress.totalMatches + Number(matched),
    totalMoves: progress.totalMoves + 1,
    boardsCleared: progress.boardsCleared + Number(cleared),
    boardBonus: progress.boardBonus + (cleared ? config.clearBonus : 0),
  };
}

export function advancePairMatchBoard(progress: PairMatchProgress): PairMatchProgress {
  if (progress.boardMatches < getPairMatchBoardConfig(progress.boardIndex).pairs) return progress;
  return { ...progress, boardIndex: progress.boardIndex + 1, boardMatches: 0 };
}

export function scorePairMatch(progress: PairMatchProgress): number {
  return Math.max(0, progress.totalMatches * 100 + progress.boardBonus - progress.totalMoves * 5);
}

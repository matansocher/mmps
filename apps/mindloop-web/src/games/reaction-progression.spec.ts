import { describe, expect, it } from 'vitest';
import {
  EBB_GREEN,
  EBB_ORANGE,
  FLASH_COLORS,
  getColorClashDifficulty,
  getEbbFlowDifficulty,
  getEbbTarget,
  getFlashMatchDifficulty,
  getReactionLevel,
  getReactionProgress,
  makeColorClashRound,
  makeEbbRound,
  makeFlashSymbol,
  nextFlashSymbol,
} from './reaction-progression';
import type { EbbRound, FlashSymbol } from './reaction-progression';

function sequence(...samples: readonly number[]): () => number {
  let index = 0;
  return () => samples[index++] ?? 0;
}

const MILESTONES = [0, 4, 8, 12, 16];

describe('reaction progression', () => {
  it.each([
    [0, 1],
    [3, 1],
    [4, 2],
    [7, 2],
    [8, 3],
    [11, 3],
    [12, 4],
    [15, 4],
    [16, 5],
    [1000, 5],
  ])('assigns %i correct answers to level %i', (correct, expected) => {
    expect(getReactionLevel(correct)).toEqual(expected);
  });

  it('shows the next correct-answer milestone and an explicit cap', () => {
    expect(getReactionProgress(0)).toEqual('Level 1 · 4 correct to level 2');
    expect(getReactionProgress(3)).toEqual('Level 1 · 1 correct to level 2');
    expect(getReactionProgress(4)).toEqual('Level 2 · 4 correct to level 3');
    expect(getReactionProgress(100)).toEqual('Level 5 · top difficulty');
  });

  it('increases actual challenge and rewards at every tier, with bounded caps', () => {
    expect(MILESTONES.map((count) => getColorClashDifficulty(count).colors)).toEqual([3, 4, 5, 5, 5]);
    expect(MILESTONES.map((count) => getColorClashDifficulty(count).congruentChance)).toEqual([0.65, 0.45, 0.3, 0.2, 0.1]);
    expect(MILESTONES.map((count) => getFlashMatchDifficulty(count).nearMatchChance)).toEqual([0, 0.3, 0.55, 0.75, 0.9]);
    expect(MILESTONES.map((count) => getEbbFlowDifficulty(count).congruentChance)).toEqual([0.8, 0.65, 0.45, 0.3, 0.15]);
    expect(MILESTONES.map((count) => getEbbFlowDifficulty(count).switchChance)).toEqual([0.2, 0.35, 0.5, 0.65, 0.8]);
    for (const difficulty of [getColorClashDifficulty, getFlashMatchDifficulty, getEbbFlowDifficulty]) {
      const rewards = MILESTONES.map((count) => difficulty(count).reward);
      expect(rewards.every((reward, index) => index === 0 || reward > rewards[index - 1])).toEqual(true);
      expect(difficulty(1000)).toEqual(difficulty(16));
    }
  });
});

describe('ColorClash rounds', () => {
  it.each(MILESTONES)('keeps one valid answer and distinct choices at %i correct', (correct) => {
    for (const sample of [0, 0.1, 0.49, 0.8, 0.9999]) {
      const round = makeColorClashRound(correct, () => sample);
      expect(round.options).toHaveLength(getColorClashDifficulty(correct).colors);
      expect(new Set(round.options.map((option) => option.name)).size).toEqual(round.options.length);
      expect(round.options.filter((option) => option.name === round.ink.name)).toHaveLength(1);
      expect(round.options).toContainEqual(round.word);
    }
  });

  it.each(MILESTONES)('respects its interference probability at %i correct', (correct) => {
    const chance = getColorClashDifficulty(correct).congruentChance;
    const agreeing = makeColorClashRound(correct, sequence(0, chance - 0.001));
    const conflicting = makeColorClashRound(correct, sequence(0, chance));
    expect(agreeing.word.name).toEqual(agreeing.ink.name);
    expect(conflicting.word.name).not.toEqual(conflicting.ink.name);
  });
});

describe('FlashMatch symbols', () => {
  const previous: FlashSymbol = { shape: 'square', color: FLASH_COLORS[0] };

  it.each(MILESTONES)('preserves the 45% exact-match branch at %i correct', (correct) => {
    const result = nextFlashSymbol(previous, correct, sequence(0.449));
    expect(result).toEqual(previous);
    expect(result).not.toBe(previous);
  });

  it('starts with clearly different shape AND color for nonmatches', () => {
    const result = nextFlashSymbol(previous, 0, sequence(0.45, 0));
    expect(result.shape).not.toEqual(previous.shape);
    expect(result.color).not.toEqual(previous.color);
  });

  it.each(MILESTONES)('generates the configured near-match ratio at %i correct', (correct) => {
    let nearMatches = 0;
    for (let i = 0; i < 1000; i += 1) {
      const result = nextFlashSymbol(previous, correct, sequence(0.9, (i + 0.5) / 1000, i % 2 ? 0.25 : 0.75));
      const sameShape = result.shape === previous.shape;
      const sameColor = result.color === previous.color;
      expect(sameShape && sameColor).toEqual(false);
      if (sameShape !== sameColor) nearMatches += 1;
    }
    expect(nearMatches / 1000).toEqual(getFlashMatchDifficulty(correct).nearMatchChance);
  });

  it.each(MILESTONES.slice(1))('adds either kind of near match without accidental matches at %i correct', (correct) => {
    const chance = getFlashMatchDifficulty(correct).nearMatchChance;
    const sameShape = nextFlashSymbol(previous, correct, sequence(0.45, chance - 0.001, 0));
    const sameColor = nextFlashSymbol(previous, correct, sequence(0.45, chance - 0.001, 0.9));
    const different = nextFlashSymbol(previous, correct, sequence(0.45, chance));
    expect(sameShape.shape).toEqual(previous.shape);
    expect(sameShape.color).not.toEqual(previous.color);
    expect(sameColor.shape).not.toEqual(previous.shape);
    expect(sameColor.color).toEqual(previous.color);
    expect(different.shape).not.toEqual(previous.shape);
    expect(different.color).not.toEqual(previous.color);
  });

  it('compares against the immediately previous symbol and never mutates it', () => {
    const changed = nextFlashSymbol(previous, 0, sequence(0.99, 0.99));
    Object.freeze(changed);
    expect(nextFlashSymbol(changed, 16, sequence(0))).toEqual(changed);
    expect(changed).not.toEqual(previous);
  });

  it.each([0, 0.49, 0.9999])('terminates with repeated random value %f', (sample) => {
    const symbol = makeFlashSymbol(() => sample);
    for (const correct of MILESTONES) {
      const next = nextFlashSymbol(symbol, correct, () => sample);
      expect(FLASH_COLORS).toContain(next.color);
      expect(['square', 'circle', 'triangle', 'diamond', 'star']).toContain(next.shape);
    }
  });
});

describe('EbbFlow rounds', () => {
  const previous: EbbRound = { points: 'left', moves: 'up', color: EBB_ORANGE };

  it.each(MILESTONES)('uses its rule-switch and interference probabilities at %i correct', (correct) => {
    const difficulty = getEbbFlowDifficulty(correct);
    const switched = makeEbbRound(correct, previous, sequence(difficulty.switchChance - 0.001, 0, difficulty.congruentChance - 0.001));
    const kept = makeEbbRound(correct, previous, sequence(difficulty.switchChance, 0, difficulty.congruentChance));
    expect(switched.color).toEqual(EBB_GREEN);
    expect(switched.moves).toEqual(switched.points);
    expect(kept.color).toEqual(EBB_ORANGE);
    expect(kept.moves).not.toEqual(kept.points);
  });

  it('switches both ways without changing orange-movement / green-pointing semantics', () => {
    const orange = makeEbbRound(16, { ...previous, color: EBB_GREEN }, sequence(0, 0, 0.99));
    expect(orange.color).toEqual(EBB_ORANGE);
    expect(getEbbTarget(orange)).toEqual(orange.moves);
    expect(getEbbTarget({ ...orange, color: EBB_GREEN })).toEqual(orange.points);
  });

  it.each([0, 0.49, 0.9999])('generates finite valid rounds with repeated random value %f', (sample) => {
    let round = makeEbbRound(0, undefined, () => sample);
    for (const correct of MILESTONES) {
      round = makeEbbRound(correct, round, () => sample);
      expect(['left', 'right', 'up', 'down']).toContain(round.points);
      expect(['left', 'right', 'up', 'down']).toContain(round.moves);
      expect([EBB_ORANGE, EBB_GREEN]).toContain(round.color);
    }
  });
});

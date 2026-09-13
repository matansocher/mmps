type Random = () => number;

const CORRECT_PER_LEVEL = 4;
const MAX_LEVEL = 5;

export function getReactionLevel(correct: number): number {
  return Math.min(MAX_LEVEL, 1 + Math.floor(Math.max(0, correct) / CORRECT_PER_LEVEL));
}

export function getReactionProgress(correct: number): string {
  const level = getReactionLevel(correct);
  return level === MAX_LEVEL ? `Level ${level} · top difficulty` : `Level ${level} · ${level * CORRECT_PER_LEVEL - correct} correct to level ${level + 1}`;
}

function choose<T>(items: readonly T[], random: Random): T {
  return items[Math.floor(random() * items.length)];
}

function shuffled<T>(items: readonly T[], random: Random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const CLASH_COLORS = [
  { name: 'Red', hex: '#ef4444', light: '#dc2626' },
  { name: 'Blue', hex: '#60a5fa', light: '#2563eb' },
  { name: 'Green', hex: '#4ade80', light: '#15803d' },
  { name: 'Yellow', hex: '#facc15', light: '#a16207' },
  { name: 'Purple', hex: '#c084fc', light: '#9333ea' },
] as const;

const CLASH_DIFFICULTY = [
  { colors: 3, congruentChance: 0.65, reward: 10 },
  { colors: 4, congruentChance: 0.45, reward: 15 },
  { colors: 5, congruentChance: 0.3, reward: 20 },
  { colors: 5, congruentChance: 0.2, reward: 25 },
  { colors: 5, congruentChance: 0.1, reward: 30 },
] as const;

export function getColorClashDifficulty(correct: number) {
  return CLASH_DIFFICULTY[getReactionLevel(correct) - 1];
}

export function makeColorClashRound(correct: number, random: Random = Math.random) {
  const difficulty = getColorClashDifficulty(correct);
  const colors = CLASH_COLORS.slice(0, difficulty.colors);
  const word = choose(colors, random);
  const ink =
    random() < difficulty.congruentChance
      ? word
      : choose(
          colors.filter((color) => color.name !== word.name),
          random,
        );
  return { word, ink, options: shuffled(colors, random) };
}

export type FlashSymbol = {
  readonly shape: 'square' | 'circle' | 'triangle' | 'diamond' | 'star';
  readonly color: string;
};

const FLASH_SHAPES: readonly FlashSymbol['shape'][] = ['square', 'circle', 'triangle', 'diamond', 'star'];
export const FLASH_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899'] as const;

const FLASH_DIFFICULTY = [
  { nearMatchChance: 0, reward: 20 },
  { nearMatchChance: 0.3, reward: 25 },
  { nearMatchChance: 0.55, reward: 30 },
  { nearMatchChance: 0.75, reward: 35 },
  { nearMatchChance: 0.9, reward: 40 },
] as const;

export function getFlashMatchDifficulty(correct: number) {
  return FLASH_DIFFICULTY[getReactionLevel(correct) - 1];
}

export function makeFlashSymbol(random: Random = Math.random): FlashSymbol {
  return { shape: choose(FLASH_SHAPES, random), color: choose(FLASH_COLORS, random) };
}

export function nextFlashSymbol(previous: FlashSymbol, correct: number, random: Random = Math.random): FlashSymbol {
  if (random() < 0.45) return { ...previous };
  const nearMatch = random() < getFlashMatchDifficulty(correct).nearMatchChance;
  const keepShape = nearMatch && random() < 0.5;
  return {
    shape: keepShape
      ? previous.shape
      : choose(
          FLASH_SHAPES.filter((shape) => shape !== previous.shape),
          random,
        ),
    color:
      nearMatch && !keepShape
        ? previous.color
        : choose(
            FLASH_COLORS.filter((color) => color !== previous.color),
            random,
          ),
  };
}

export type EbbDirection = 'left' | 'right' | 'up' | 'down';
export const EBB_ORANGE = '#f97316';
export const EBB_GREEN = '#22c55e';

export type EbbRound = {
  readonly points: EbbDirection;
  readonly moves: EbbDirection;
  readonly color: typeof EBB_ORANGE | typeof EBB_GREEN;
};

const EBB_DIRECTIONS: readonly EbbDirection[] = ['left', 'right', 'up', 'down'];
const EBB_DIFFICULTY = [
  { congruentChance: 0.8, switchChance: 0.2, reward: 15 },
  { congruentChance: 0.65, switchChance: 0.35, reward: 20 },
  { congruentChance: 0.45, switchChance: 0.5, reward: 25 },
  { congruentChance: 0.3, switchChance: 0.65, reward: 30 },
  { congruentChance: 0.15, switchChance: 0.8, reward: 35 },
] as const;

export function getEbbFlowDifficulty(correct: number) {
  return EBB_DIFFICULTY[getReactionLevel(correct) - 1];
}

export function makeEbbRound(correct: number, previous?: EbbRound, random: Random = Math.random): EbbRound {
  const difficulty = getEbbFlowDifficulty(correct);
  const color = previous ? (random() < difficulty.switchChance ? (previous.color === EBB_ORANGE ? EBB_GREEN : EBB_ORANGE) : previous.color) : random() < 0.5 ? EBB_ORANGE : EBB_GREEN;
  const points = choose(EBB_DIRECTIONS, random);
  const moves =
    random() < difficulty.congruentChance
      ? points
      : choose(
          EBB_DIRECTIONS.filter((direction) => direction !== points),
          random,
        );
  return { points, moves, color };
}

export function getEbbTarget(round: EbbRound): EbbDirection {
  return round.color === EBB_ORANGE ? round.moves : round.points;
}

export type Drop = {
  readonly id: number;
  readonly text: string;
  readonly answer: number;
  readonly x: number;
  readonly y: number;
  readonly speed: number;
  readonly level: number;
};

export function getDropReward(drop: Drop): number {
  return 25 + drop.level * 5 + Math.round(drop.y * 20);
}

export function advanceDrops(drops: readonly Drop[], seconds: number): { readonly drops: Drop[]; readonly missed: number } {
  const moved = drops.map((drop) => ({ ...drop, y: drop.y + drop.speed * Math.max(0, seconds) }));
  return { drops: moved.filter((drop) => drop.y < 1), missed: moved.filter((drop) => drop.y >= 1).length };
}

export function findLowestMatch(drops: readonly Drop[], answer: number): Drop | undefined {
  return drops.reduce<Drop | undefined>((lowest, drop) => drop.answer === answer && (!lowest || drop.y > lowest.y) ? drop : lowest, undefined);
}

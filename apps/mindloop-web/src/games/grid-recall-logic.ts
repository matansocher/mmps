export function getGridRecallRoundConfig(round: number) {
  const size = Math.min(5, 3 + Math.floor(round / 2));
  const lit = Math.min(Math.floor(size * size / 2), 3 + round);
  return {
    size,
    lit,
    revealMs: Math.max(1200, 2000 - round * 50),
    reward: lit * 10 + round * 10,
  };
}

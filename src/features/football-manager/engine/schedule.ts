export type RoundRobinFixture = {
  readonly matchday: number; // 1-based
  readonly homeTeamId: number;
  readonly awayTeamId: number;
};

// Double round-robin schedule via the circle method. Every team plays every
// other twice (home and away). For N teams this yields 2*(N-1) matchdays with
// N/2 games each. A bye is added when N is odd.
export function generateRoundRobin(teamIds: readonly number[]): RoundRobinFixture[] {
  const teams = [...teamIds];
  const hasBye = teams.length % 2 !== 0;
  if (hasBye) teams.push(-1); // -1 = bye placeholder

  const n = teams.length;
  const rounds = n - 1;
  const half = n / 2;
  const fixtures: RoundRobinFixture[] = [];

  const rotation = [...teams];
  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < half; i++) {
      const a = rotation[i];
      const b = rotation[n - 1 - i];
      if (a === -1 || b === -1) continue;

      // Alternate which side is home per pairing/round so home games spread out.
      const aIsHome = (round + i) % 2 === 0;
      const [home, away] = aIsHome ? [a, b] : [b, a];

      // First leg.
      fixtures.push({ matchday: round + 1, homeTeamId: home, awayTeamId: away });
      // Reverse leg (swapped venue) in the second half of the season.
      fixtures.push({ matchday: round + 1 + rounds, homeTeamId: away, awayTeamId: home });
    }

    // Rotate all but the first element clockwise (circle method).
    const last = rotation.splice(n - 1, 1)[0];
    rotation.splice(1, 0, last);
  }

  return fixtures.sort((x, y) => x.matchday - y.matchday);
}

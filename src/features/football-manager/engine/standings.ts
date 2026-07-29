import type { FixtureDocument, StandingRow, TeamDocument } from '../types';

// Computes a league table from played fixtures. Sorted by points, then goal
// difference, then goals for, then team name (stable, deterministic).
export function computeStandings(teams: readonly TeamDocument[], fixtures: readonly FixtureDocument[]): StandingRow[] {
  const rows = new Map<number, { row: StandingRow }>();
  for (const team of teams) {
    rows.set(team.eaTeamId, {
      row: {
        teamId: team.eaTeamId,
        teamName: team.name,
        logoUrl: team.logoUrl,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      },
    });
  }

  for (const f of fixtures) {
    if (!f.played || f.homeGoals === null || f.awayGoals === null) continue;
    const home = rows.get(f.homeTeamId);
    const away = rows.get(f.awayTeamId);
    if (!home || !away) continue;

    apply(home.row, f.homeGoals, f.awayGoals);
    apply(away.row, f.awayGoals, f.homeGoals);
    rows.set(f.homeTeamId, home);
    rows.set(f.awayTeamId, away);
  }

  return [...rows.values()]
    .map((entry) => entry.row)
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.teamName.localeCompare(b.teamName));
}

// Mutates a row in place with the outcome of one match (goals for/against).
function apply(row: StandingRow, scored: number, conceded: number): void {
  const mutable = row as { -readonly [K in keyof StandingRow]: StandingRow[K] };
  mutable.played += 1;
  mutable.goalsFor += scored;
  mutable.goalsAgainst += conceded;
  mutable.goalDifference = mutable.goalsFor - mutable.goalsAgainst;
  if (scored > conceded) {
    mutable.won += 1;
    mutable.points += 3;
  } else if (scored === conceded) {
    mutable.drawn += 1;
    mutable.points += 1;
  } else {
    mutable.lost += 1;
  }
}

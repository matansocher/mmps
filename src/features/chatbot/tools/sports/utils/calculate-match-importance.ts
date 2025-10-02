import { COMPETITION_IDS_MAP } from '@services/scores-365';

export const LEAGUE_IMPORTANCE: Record<number, number> = {
  [COMPETITION_IDS_MAP.CHAMPIONS_LEAGUE]: 10,
  [COMPETITION_IDS_MAP.PREMIER_LEAGUE]: 8,
  [COMPETITION_IDS_MAP.LA_LIGA]: 8,
  [COMPETITION_IDS_MAP.LIGAT_HAAL]: 8,
};

export const IMPORTANCE_THRESHOLD = 15;

export async function calculateMatchImportance(
  match: { homeTeam: string; awayTeam: string; competitionId: number },
  competitionTable: Array<{ name: string; value: number; midValue: number }> | null,
): Promise<number> {
  let score = LEAGUE_IMPORTANCE[match.competitionId] || 0;

  if (competitionTable && competitionTable.length > 0) {
    const homeTeamData = competitionTable.find((row) => row.name === match.homeTeam);
    const awayTeamData = competitionTable.find((row) => row.name === match.awayTeam);

    if (homeTeamData && awayTeamData) {
      const homePosition = competitionTable.indexOf(homeTeamData) + 1;
      const awayPosition = competitionTable.indexOf(awayTeamData) + 1;
      const totalTeams = competitionTable.length;

      // 2. Top teams playing (positions 1-6 are most important)
      if (homePosition <= 6) score += 8 - homePosition; // 7 points for 1st, 6 for 2nd, etc.
      if (awayPosition <= 6) score += 8 - awayPosition;

      // 3. Close matches in table (within 3 positions = title race / relegation battle)
      const positionDiff = Math.abs(homePosition - awayPosition);
      if (positionDiff <= 3) {
        score += 5; // Teams close in table = important
      }

      // 4. Derby/rivalry indicator (both teams in top 10)
      if (homePosition <= 10 && awayPosition <= 10) {
        score += 3;
      }

      // 5. Top vs Top clash (both in top 4)
      if (homePosition <= 4 && awayPosition <= 4) {
        score += 8; // Title-deciding matches
      }

      // 6. Points difference (close in points = more important)
      const pointsDiff = Math.abs(homeTeamData.value - awayTeamData.value);
      if (pointsDiff <= 3) {
        score += 4; // Very close in points
      } else if (pointsDiff <= 6) {
        score += 2; // Moderately close
      }
    }
  }

  return score;
}

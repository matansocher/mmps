import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { COMPETITION_IDS_MAP } from '@services/scores-365';
import type { CompetitionTableDetails } from '@services/scores-365';
import { getSportsCompetitionTable } from '@shared/sports';
import { competitionSchema } from './competition-schema';

const schema = z.object({
  competition: competitionSchema,
});

export type CompetitionTableToolRow = {
  readonly position: number;
  readonly team: string;
  readonly played: number;
  readonly won?: number;
  readonly drawn?: number;
  readonly lost?: number;
  readonly goalsFor?: number;
  readonly goalsAgainst?: number;
  readonly goalDifference?: number;
  readonly points: number;
  readonly zone?: string;
  readonly zoneColor?: string;
};

export type CompetitionTableToolResult = {
  readonly competition: string;
  readonly table: readonly CompetitionTableToolRow[];
};

function toCompetitionTableToolResult({ competition, competitionTable }: CompetitionTableDetails): CompetitionTableToolResult {
  const table = competitionTable.map((row, index) => ({
    position: row.position ?? index + 1,
    team: row.competitor.name,
    played: row.gamesPlayed,
    won: row.gamesWon,
    drawn: row.gamesDrawn,
    lost: row.gamesLost,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    goalDifference: row.goalsFor != null && row.goalsAgainst != null ? row.goalsFor - row.goalsAgainst : undefined,
    points: row.points,
    zone: row.zone?.name,
    zoneColor: row.zone?.color,
  }));
  return { competition: competition.name, table };
}

async function runner({ competition }: z.infer<typeof schema>) {
  const tableDetails = await getSportsCompetitionTable(COMPETITION_IDS_MAP[competition]);

  if (!tableDetails?.competitionTable?.length) {
    return `No table data available for ${competition}.`;
  }

  return toCompetitionTableToolResult(tableDetails);
}

export const competitionTableTool = tool(runner, {
  name: 'competition_table',
  description: `Get the football league table/standings for a specific competition: position, played, won/drawn/lost, goals, goal difference, points and the qualification/relegation zone of each team.
Rules:
- A standings table image (every team, W/D/L, goal difference, points and coloured zones) is sent automatically right before your reply, so do NOT reproduce the table in text.
- Reply in 2-4 short lines: the leader and the gap to second place, plus the team(s) the user asked about (position, points, zone if any). Mention notable zone battles only when relevant.
- Translate team names to the user's language.`,
  schema,
});

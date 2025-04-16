import type { CompetitionTableDetails } from '@services/scores-365';

export function generateTableString(competitionTableDetails: CompetitionTableDetails): string {
  const rows = competitionTableDetails.competitionTable
    .sort((a, b) => b.points - a.points)
    .map(({ competitor, points }, index) => {
      return `${index + 1} ${competitor.name} ${points}`;
    })
    .join('\n');
  const { icon, name } = competitionTableDetails.competition;
  return `${icon} ${name} ${icon}\n\n${rows}`;
}

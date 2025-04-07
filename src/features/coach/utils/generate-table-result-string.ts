import type { CompetitionTableDetails } from '@services/scores-365/interface';

export function generateTableResultsString(competitionTableDetails: CompetitionTableDetails): string {
  const rows = competitionTableDetails.competitionTable
    .sort((a, b) => a.position - b.position)
    .map(({ competitor, points, position }) => {
      return `${position} ${competitor.name} ${points}`;
    })
    .join('\n');
  const { icon, name } = competitionTableDetails.competition;
  return `${icon} ${name} ${icon}\n\n${rows}`;
}

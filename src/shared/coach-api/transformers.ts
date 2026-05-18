import type { MatchDetails, CompetitionTableRow, Competition } from '@services/scores-365';
import type { CompetitionRef, MatchStatus, MatchSummary, TableRow } from './dto';

const FINISHED_HINTS = ['הסתיים', 'הסתיימה', 'finished', 'ft', 'ended'];

export function classifyStatus(m: MatchDetails): MatchStatus {
  const lower = (m.statusText ?? '').toLowerCase();
  if (FINISHED_HINTS.some((h) => lower.includes(h))) return 'finished';
  if (m.gameTime > 0) return 'live';
  return 'scheduled';
}

export function toMatchSummary(m: MatchDetails, competitionId: number): MatchSummary {
  const status = classifyStatus(m);
  const hasScore = m.homeCompetitor.score >= 0 && m.awayCompetitor.score >= 0;
  return {
    id: m.id,
    home: { id: m.homeCompetitor.id, name: m.homeCompetitor.name, symbolicName: m.homeCompetitor.symbolicName },
    away: { id: m.awayCompetitor.id, name: m.awayCompetitor.name, symbolicName: m.awayCompetitor.symbolicName },
    status,
    ...(status === 'live' ? { minute: m.gameTime } : {}),
    startTime: m.startTime,
    ...(hasScore && status !== 'scheduled' ? { score: { home: m.homeCompetitor.score, away: m.awayCompetitor.score } } : {}),
    competitionId,
  };
}

export function toCompetitionRef(c: Competition, themeColor?: string): CompetitionRef {
  return {
    id: c.id,
    name: c.name,
    ...(c.icon ? { icon: c.icon } : {}),
    ...(themeColor ? { themeColor } : {}),
  };
}

export function toTableRows(rows: ReadonlyArray<CompetitionTableRow>, zoning?: { championsTop?: number; europeTop?: number; relegationBottom?: number }): TableRow[] {
  const total = rows.length;
  const championsTop = zoning?.championsTop ?? 0;
  const europeTop = zoning?.europeTop ?? 0;
  const relegationBottom = zoning?.relegationBottom ?? 0;
  return rows.map((row, idx) => {
    const rank = idx + 1;
    let zone: TableRow['zone'] = null;
    if (rank <= championsTop) zone = 'champions';
    else if (rank <= championsTop + europeTop) zone = 'europe';
    else if (rank > total - relegationBottom) zone = 'relegation';
    return {
      rank,
      team: { id: row.competitor.id, name: row.competitor.name },
      played: row.gamesPlayed,
      goalDifference: 0,
      points: row.points,
      zone,
    };
  });
}

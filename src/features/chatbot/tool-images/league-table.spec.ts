import type { CompetitionTableToolRow } from '@shared/ai/tools';
import { buildLeagueTableImage, selectHighlightedPositions, selectLeagueTable } from './league-table';
import { getZoneColors } from './league-table-image';

const row = (position: number, team: string, zoneColor?: string): CompetitionTableToolRow => ({ position, team, played: 7, points: 21 - position, zoneColor });
const rows = [row(1, "מנצ'סטר סיטי"), row(2, 'ארסנל'), row(3, 'ברייטון'), row(4, "צ'לסי"), row(5, 'ליברפול')];

describe('selectLeagueTable()', () => {
  test.each([
    { description: 'no table result', toolResults: [{ toolName: 'weather', data: {} }] },
    { description: 'string result', toolResults: [{ toolName: 'competition_table', data: 'No table data available' }] },
    { description: 'empty table', toolResults: [{ toolName: 'competition_table', data: { competition: 'x', table: [] } }] },
  ])('should return null for $description', ({ toolResults }) => {
    expect(selectLeagueTable(toolResults)).toEqual(null);
  });

  test('should use the latest table result in the turn', () => {
    const toolResults = [
      { toolName: 'competition_table', data: { competition: 'first', table: rows } },
      { toolName: 'competition_table', data: { competition: 'second', table: rows } },
    ];
    expect(selectLeagueTable(toolResults)?.competition).toEqual('second');
  });
});

describe('selectHighlightedPositions()', () => {
  test.each([
    { description: 'mentioned non-leader teams', reply: 'מנצ׳סטר סיטי בראש, ארסנל וצ׳לסי מאחור', expected: [2, 4] },
    { description: 'the leader when only it is mentioned', reply: "מנצ'סטר סיטי בפסגה", expected: [1] },
    { description: 'nothing when no team is mentioned', reply: 'Arsenal is second', expected: [] },
    { description: 'at most 3 teams', reply: 'ארסנל, ברייטון, צלסי וליברפול', expected: [2, 3, 4] },
  ])('should return $description', ({ reply, expected }) => {
    expect(selectHighlightedPositions(rows, reply)).toEqual(expected);
  });
});

describe('getZoneColors()', () => {
  test('should use API zone colors when present', () => {
    expect(getZoneColors([row(1, 'a', '#111111'), row(2, 'b'), row(3, 'c', '#222222')])).toEqual(['#111111', undefined, '#222222']);
  });

  test('should highlight only the leader in short tables without zones', () => {
    expect(getZoneColors(rows).filter(Boolean).length).toEqual(1);
  });

  test('should highlight the leader and bottom 3 in long tables without zones', () => {
    const colors = getZoneColors(Array.from({ length: 10 }, (_, index) => row(index + 1, `team ${index}`)));
    expect(colors.map((color) => Boolean(color))).toEqual([true, false, false, false, false, false, false, true, true, true]);
  });
});

describe('buildLeagueTableImage()', () => {
  test('should return null without a table result', async () => {
    expect(await buildLeagueTableImage([], 'hi')).toEqual(null);
  });

  test('should render a PNG for a table result', async () => {
    const image = await buildLeagueTableImage([{ toolName: 'competition_table', data: { competition: 'פרמייר ליג', table: rows } }], 'ארסנל שנייה');
    expect(image?.subarray(1, 4).toString()).toEqual('PNG');
  });
});

import type { MatchCard, MatchCardGroup } from '@shared/sports';
import type { ToolResult } from '../types';
import { collectMatchCardGroups, COMPETITION_MATCHES_IMAGE_BUILDER, MATCH_SUMMARY_IMAGE_BUILDER, selectMatchCardGroups } from './football-matches';

function createCard(id: number, home: string, away: string): MatchCard {
  return { id, date: '2026-10-19', time: '20:00', home, away, homeScore: null, awayScore: null, status: 'scheduled', minute: null, channel: null };
}

function createResult(toolName: string, competitions: MatchCardGroup[]): ToolResult {
  return { toolName, data: { competitions } };
}

const LALIGA: MatchCardGroup = {
  competition: 'LaLiga',
  matches: [createCard(1, 'Barcelona', 'Sevilla'), createCard(2, 'Real Madrid', 'Getafe'), createCard(3, 'Valencia', 'Betis'), createCard(4, 'Girona', 'Celta')],
};

describe('collectMatchCardGroups()', () => {
  it('should merge results of the requested tools and skip duplicates, errors and text results', () => {
    const groups = collectMatchCardGroups(
      [
        createResult('competition_matches', [LALIGA]),
        createResult('competition_matches', [{ competition: 'LaLiga', matches: [createCard(1, 'Barcelona', 'Sevilla'), createCard(5, 'Osasuna', 'Alaves')] }]),
        createResult('competition_matches', [{ competition: 'Premier League', matches: [createCard(6, 'Arsenal', 'Chelsea')] }]),
        { toolName: 'competition_matches', data: 'No upcoming matches found for SERIE_A.' },
        { toolName: 'competition_matches', data: { competitions: [{ competition: 'Error', matches: [createCard(7, 'X', 'Y')] }] }, error: 'boom' },
        createResult('match_summary', [{ competition: 'Other', matches: [createCard(8, 'X', 'Y')] }]),
      ],
      ['competition_matches'],
    );

    expect(groups.map((group) => [group.competition, group.matches.map((match) => match.id)])).toEqual([
      ['LaLiga', [1, 2, 3, 4, 5]],
      ['Premier League', [6]],
    ]);
  });
});

describe('selectMatchCardGroups()', () => {
  test.each([
    { reply: 'Barcelona host Sevilla on Sunday at 20:00', expected: [1] },
    { reply: 'Barcelona and Real Madrid both play on Sunday', expected: [1, 2] },
    { reply: 'Here are the next fixtures', expected: [1, 2, 3, 4] },
    { reply: 'Barcelona, Real Madrid, Valencia and Girona all play at home', expected: [1, 2, 3, 4] },
  ])('should select $expected for "$reply"', ({ reply, expected }) => {
    const groups = selectMatchCardGroups([LALIGA], reply);
    expect(groups.flatMap((group) => group.matches.map((match) => match.id))).toEqual(expected);
  });
});

describe('football match image builders', () => {
  it('should render a PNG for fixtures and summaries', async () => {
    const results = [createResult('competition_matches', [LALIGA])];
    const fixtures = await COMPETITION_MATCHES_IMAGE_BUILDER.build(results, 'Barcelona host Sevilla');
    const summary = await MATCH_SUMMARY_IMAGE_BUILDER.build([createResult('match_summary', [LALIGA])], 'משחקי היום');

    expect(fixtures?.subarray(1, 4).toString()).toEqual('PNG');
    expect(summary?.subarray(1, 4).toString()).toEqual('PNG');
  });

  it('should return null without structured matches', async () => {
    expect(await MATCH_SUMMARY_IMAGE_BUILDER.build([{ toolName: 'match_summary', data: 'No matches found for 2026-10-19.' }], '')).toBeNull();
  });
});

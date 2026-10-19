import type { CompetitionDetails, MatchDetails } from '@services/scores-365';
import { toMatchCard, toMatchCardGroups, upcomingMatchesToCardGroups } from './match-cards';
import { toMatchCardSections } from './match-cards-image';
import type { MatchCard } from './match-cards';

function createMatch(overrides: Partial<MatchDetails> = {}): MatchDetails {
  return {
    id: 1,
    startTime: '2026-10-19T18:30:00Z',
    statusText: 'טרם החל',
    gameTime: -1,
    venue: 'Bloomfield',
    stage: '',
    homeCompetitor: { id: 10, name: 'Home', symbolicName: 'HOM', score: -1, color: '' },
    awayCompetitor: { id: 20, name: 'Away', symbolicName: 'AWY', score: -1, color: '' },
    channel: 'Sport 5',
    ...overrides,
  } as MatchDetails;
}

function createCard(id: number, date: string): MatchCard {
  return { id, date, time: '20:00', home: `H${id}`, away: `A${id}`, homeScore: null, awayScore: null, status: 'scheduled', minute: null, channel: null };
}

describe('toMatchCard()', () => {
  test.each([
    {
      name: 'scheduled',
      match: createMatch(),
      expected: { status: 'scheduled', homeScore: null, awayScore: null, minute: null, time: '21:30', date: '2026-10-19', channel: 'Sport 5' },
    },
    {
      name: 'live',
      match: createMatch({ statusText: 'מחצית שנייה', gameTime: 67, homeCompetitor: { id: 10, name: 'Home', symbolicName: '', score: 2, color: '' }, awayCompetitor: { id: 20, name: 'Away', symbolicName: '', score: 1, color: '' } }),
      expected: { status: 'live', homeScore: 2, awayScore: 1, minute: 67 },
    },
    {
      name: 'finished',
      match: createMatch({ statusText: 'הסתיים', gameTime: 90, channel: '', homeCompetitor: { id: 10, name: 'Home', symbolicName: '', score: 0, color: '' }, awayCompetitor: { id: 20, name: 'Away', symbolicName: '', score: 3, color: '' } }),
      expected: { status: 'finished', homeScore: 0, awayScore: 3, minute: null, channel: null },
    },
  ])('should map a $name match', ({ match, expected }) => {
    expect(toMatchCard(match)).toEqual(expect.objectContaining({ id: 1, home: 'Home', away: 'Away', ...expected }));
  });
});

describe('toMatchCardGroups()', () => {
  it('should sort matches by kickoff and skip empty competitions', () => {
    const details = [
      { competition: { id: 1, name: 'Ligat Haal' }, matches: [createMatch({ id: 2, startTime: '2026-10-19T19:00:00Z' }), createMatch({ id: 1, startTime: '2026-10-19T17:00:00Z' })] },
      { competition: { id: 2, name: 'Empty' }, matches: [] },
    ] as CompetitionDetails[];

    const groups = toMatchCardGroups(details);

    expect(groups.map((group) => group.competition)).toEqual(['Ligat Haal']);
    expect(groups[0].matches.map((match) => match.id)).toEqual([1, 2]);
  });
});

describe('upcomingMatchesToCardGroups()', () => {
  it('should group upcoming matches by competition in kickoff order', () => {
    const team = (name: string) => ({ id: 0, name });
    const groups = upcomingMatchesToCardGroups([
      { id: 3, competitionName: 'LaLiga', startTime: '2026-10-20T19:00:00Z', homeTeam: team('Real Madrid'), awayTeam: team('Getafe') },
      { id: 1, competitionName: 'Premier League', startTime: '2026-10-19T14:00:00Z', homeTeam: team('Arsenal'), awayTeam: team('Chelsea') },
      { id: 2, competitionName: 'LaLiga', startTime: '2026-10-19T19:00:00Z', homeTeam: team('Barcelona'), awayTeam: team('Sevilla') },
    ]);

    expect(groups.map((group) => [group.competition, group.matches.map((match) => match.id)])).toEqual([
      ['Premier League', [1]],
      ['LaLiga', [2, 3]],
    ]);
    expect(groups[1].matches[0]).toEqual(expect.objectContaining({ home: 'Barcelona', away: 'Sevilla', status: 'scheduled', time: '22:00', date: '2026-10-19' }));
  });
});

describe('toMatchCardSections()', () => {
  it('should split competitions by date', () => {
    const { sections, hiddenCount } = toMatchCardSections([{ competition: 'LaLiga', matches: [createCard(1, '2026-10-19'), createCard(2, '2026-10-19'), createCard(3, '2026-10-20')] }]);

    expect(sections.map((section) => [section.date, section.matches.length])).toEqual([
      ['2026-10-19', 2],
      ['2026-10-20', 1],
    ]);
    expect(hiddenCount).toEqual(0);
  });

  it('should cap the total number of matches across competitions', () => {
    const { sections, hiddenCount } = toMatchCardSections(
      [
        { competition: 'A', matches: [createCard(1, '2026-10-19'), createCard(2, '2026-10-19')] },
        { competition: 'B', matches: [createCard(3, '2026-10-19'), createCard(4, '2026-10-19')] },
      ],
      3,
    );

    expect(sections.map((section) => [section.competition, section.matches.map((match) => match.id)])).toEqual([
      ['A', [1, 2]],
      ['B', [3]],
    ]);
    expect(hiddenCount).toEqual(1);
  });
});

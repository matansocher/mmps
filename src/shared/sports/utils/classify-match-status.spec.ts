import type { MatchDetails } from '@services/scores-365';
import { classifyMatchStatus } from './classify-match-status';

const liveMatch: MatchDetails = {
  id: 1,
  startTime: '2026-05-18T18:00:00Z',
  statusText: "67'",
  gameTime: 67,
  stage: 'Matchday 35',
  venue: 'Camp Nou',
  homeCompetitor: { id: 10, name: 'Barcelona', symbolicName: 'BAR', score: 2, color: '#a50044' },
  awayCompetitor: { id: 11, name: 'Real Madrid', symbolicName: 'RMA', score: 1, color: '#febe10' },
  channel: 'Sport 1',
};

const finishedMatch: MatchDetails = { ...liveMatch, statusText: 'הסתיים', gameTime: 90 };
const scheduledMatch: MatchDetails = { ...liveMatch, statusText: '20:00', gameTime: 0, homeCompetitor: { ...liveMatch.homeCompetitor, score: -1 }, awayCompetitor: { ...liveMatch.awayCompetitor, score: -1 } };

describe('classifyMatchStatus()', () => {
  it('classifies live matches by positive gameTime and non-final status', () => {
    expect(classifyMatchStatus(liveMatch)).toEqual('live');
  });

  it('classifies finished matches when statusText mentions finish keywords', () => {
    expect(classifyMatchStatus(finishedMatch)).toEqual('finished');
  });

  it('classifies scheduled matches when no score yet and gameTime is 0', () => {
    expect(classifyMatchStatus(scheduledMatch)).toEqual('scheduled');
  });

  test.each([
    { statusText: 'Finished', gameTime: 90, expected: 'finished' },
    { statusText: 'FT', gameTime: 90, expected: 'finished' },
    { statusText: 'ended', gameTime: 90, expected: 'finished' },
    { statusText: 'הסתיימה', gameTime: 90, expected: 'finished' },
  ])('detects finished with statusText "$statusText"', ({ statusText, gameTime, expected }) => {
    const match = { ...liveMatch, statusText, gameTime };
    expect(classifyMatchStatus(match)).toEqual(expected);
  });
});

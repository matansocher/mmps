import type { MatchDetails } from '@services/scores-365';
import { toMatchSummary, classifyStatus } from './transformers';

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

describe('classifyStatus()', () => {
  it('classifies live matches by positive gameTime and non-final status', () => {
    expect(classifyStatus(liveMatch)).toEqual('live');
  });
  it('classifies finished matches when statusText mentions finish keywords', () => {
    expect(classifyStatus(finishedMatch)).toEqual('finished');
  });
  it('classifies scheduled matches when no score yet and gameTime is 0', () => {
    expect(classifyStatus(scheduledMatch)).toEqual('scheduled');
  });
});

describe('toMatchSummary()', () => {
  it('maps a live match with minute and score', () => {
    const summary = toMatchSummary(liveMatch, 1001);
    expect(summary).toEqual({
      id: 1,
      home: { id: 10, name: 'Barcelona', symbolicName: 'BAR' },
      away: { id: 11, name: 'Real Madrid', symbolicName: 'RMA' },
      status: 'live',
      minute: 67,
      startTime: '2026-05-18T18:00:00Z',
      score: { home: 2, away: 1 },
      competitionId: 1001,
    });
  });

  it('omits score and minute for scheduled match', () => {
    const summary = toMatchSummary(scheduledMatch, 1001);
    expect(summary.status).toEqual('scheduled');
    expect(summary.score).toBeUndefined();
    expect(summary.minute).toBeUndefined();
  });
});

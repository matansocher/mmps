import { searchEvents } from '@services/polymarket';
import type { EventSummary } from '@services/polymarket';
import { findMatchEventSlug, isMatchEventFor, tokenizeTeamName } from './find-match-event';

vi.mock('@services/polymarket', () => ({
  searchEvents: vi.fn(),
}));

const KICKOFF = new Date('2026-08-22T18:00:00Z');

function createEvent(overrides: Partial<EventSummary> = {}): EventSummary {
  return {
    id: '1',
    title: 'RCD Espanyol de Barcelona vs. Real Madrid CF',
    slug: 'lal-esp-rea-2026-08-22',
    volume24hr: 1000,
    active: true,
    closed: false,
    endDate: '2026-08-22T19:30:00Z',
    polymarketUrl: 'https://polymarket.com/event/lal-esp-rea-2026-08-22',
    ...overrides,
  };
}

describe('tokenizeTeamName()', () => {
  test.each([
    { name: 'Real Madrid CF', expected: ['real', 'madrid'] },
    { name: 'FC Internazionale Milano', expected: ['internazionale', 'milano'] },
    { name: 'Maccabi Haifa FC', expected: ['maccabi', 'haifa'] },
    { name: 'AC Monza', expected: ['monza'] },
  ])('should strip club-name noise from $name', ({ name, expected }) => {
    expect(tokenizeTeamName(name)).toEqual(expected);
  });

  it('should deduplicate repeated tokens', () => {
    expect(tokenizeTeamName('Haifa Haifa')).toEqual(['haifa']);
  });
});

describe('isMatchEventFor()', () => {
  it('should accept an event whose title contains both teams near kickoff', () => {
    expect(isMatchEventFor(createEvent(), 'Real Madrid', 'Espanyol', KICKOFF)).toEqual(true);
  });

  it('should accept when the polymarket name is a longer form of the team name', () => {
    const event = createEvent({ title: 'FC Internazionale Milano vs. AC Monza' });
    expect(isMatchEventFor(event, 'Inter', 'Monza', KICKOFF)).toEqual(true);
  });

  it('should reject a season-long event that mentions only one team', () => {
    const event = createEvent({ title: 'LALIGA: 2027 Champion', endDate: '2027-05-30T23:59:00Z' });
    expect(isMatchEventFor(event, 'Real Madrid', 'Espanyol', KICKOFF)).toEqual(false);
  });

  it('should reject a side market for the same fixture', () => {
    const event = createEvent({ title: 'RCD Espanyol de Barcelona vs. Real Madrid CF - Exact Score' });
    expect(isMatchEventFor(event, 'Real Madrid', 'Espanyol', KICKOFF)).toEqual(false);
  });

  it('should reject the same fixture on a different date', () => {
    const event = createEvent({ endDate: '2026-09-29T19:30:00Z' });
    expect(isMatchEventFor(event, 'Real Madrid', 'Espanyol', KICKOFF)).toEqual(false);
  });

  it('should reject an event missing an end date', () => {
    expect(isMatchEventFor(createEvent({ endDate: null }), 'Real Madrid', 'Espanyol', KICKOFF)).toEqual(false);
  });

  it('should reject a closed event', () => {
    expect(isMatchEventFor(createEvent({ closed: true }), 'Real Madrid', 'Espanyol', KICKOFF)).toEqual(false);
  });

  it('should reject when only one of the two teams is present', () => {
    const event = createEvent({ title: 'RCD Espanyol de Barcelona vs. Getafe CF' });
    expect(isMatchEventFor(event, 'Real Madrid', 'Espanyol', KICKOFF)).toEqual(false);
  });
});

describe('findMatchEventSlug()', () => {
  beforeEach(() => {
    vi.mocked(searchEvents).mockReset();
  });

  it('should return the slug from the combined-names query', async () => {
    vi.mocked(searchEvents).mockResolvedValue({ events: [createEvent()], keyword: '', fetchedAt: '' });

    expect(await findMatchEventSlug('Real Madrid', 'Espanyol', KICKOFF)).toEqual('lal-esp-rea-2026-08-22');
    expect(searchEvents).toHaveBeenCalledTimes(1);
    expect(searchEvents).toHaveBeenCalledWith('Real Madrid Espanyol');
  });

  it('should fall back to single-team queries when the combined query misses', async () => {
    vi.mocked(searchEvents)
      .mockResolvedValueOnce({ events: [createEvent({ title: 'Serie A: 2027 Champion', endDate: '2027-05-30T23:59:00Z' })], keyword: '', fetchedAt: '' })
      .mockResolvedValueOnce({ events: [], keyword: '', fetchedAt: '' })
      .mockResolvedValueOnce({ events: [createEvent({ title: 'FC Internazionale Milano vs. AC Monza', slug: 'sea-int-mon-2026-08-22' })], keyword: '', fetchedAt: '' });

    expect(await findMatchEventSlug('Inter', 'Monza', KICKOFF)).toEqual('sea-int-mon-2026-08-22');
    expect(searchEvents).toHaveBeenNthCalledWith(3, 'Monza');
  });

  it('should return null when no query yields a valid fixture', async () => {
    vi.mocked(searchEvents).mockResolvedValue({ events: [], keyword: '', fetchedAt: '' });

    expect(await findMatchEventSlug('Liverpool', 'Arsenal', KICKOFF)).toEqual(null);
    expect(searchEvents).toHaveBeenCalledTimes(3);
  });

  it('should keep searching when a query throws', async () => {
    vi.mocked(searchEvents)
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValue({ events: [createEvent()], keyword: '', fetchedAt: '' });

    expect(await findMatchEventSlug('Real Madrid', 'Espanyol', KICKOFF)).toEqual('lal-esp-rea-2026-08-22');
  });

  it('should return null when every query throws', async () => {
    vi.mocked(searchEvents).mockRejectedValue(new Error('503'));

    expect(await findMatchEventSlug('Real Madrid', 'Espanyol', KICKOFF)).toEqual(null);
  });
});

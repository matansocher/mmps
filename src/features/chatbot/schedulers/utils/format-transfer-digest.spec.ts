import { describe, expect, it } from 'vitest';
import type { PendingRumour } from '@shared/transfer-tracker';
import { formatTransferDigest, formatTransferDigestFallback, shortClubName, shortFee } from './format-transfer-digest';

function makeRumour(overrides: Partial<PendingRumour> = {}): PendingRumour {
  return {
    chatId: 1,
    rumourId: 'player-to-club',
    reportedAt: new Date('2026-08-10T10:00:00Z'),
    summary: null,
    status: 'rumour',
    probability: 50,
    playerName: 'Player One',
    playerPosition: null,
    marketValueEur: null,
    feeLabel: null,
    fromClub: 'Chelsea',
    toClub: 'Como',
    sourceName: null,
    sourceUrl: null,
    collectedAt: new Date('2026-08-10T10:00:00Z'),
    sentCount: 0,
    ...overrides,
  };
}

describe('shortClubName()', () => {
  it('should map known long names to their short form', () => {
    expect(shortClubName('Olympique Marseille')).toBe('Marseille');
    expect(shortClubName('Manchester City')).toBe('Man City');
    expect(shortClubName('Paris Saint-Germain')).toBe('PSG');
  });

  it('should map alternative spellings of the same club to one name', () => {
    expect(shortClubName('OL')).toBe('Lyon');
    expect(shortClubName('Lione')).toBe('Lyon');
  });

  it('should strip club-type prefixes for unknown names', () => {
    expect(shortClubName('AC Monza')).toBe('Monza');
  });

  it('should fall back to a placeholder when the club is missing', () => {
    expect(shortClubName(null)).toBe('?');
  });
});

describe('shortFee()', () => {
  it('should reduce a fee range to its lower bound', () => {
    expect(shortFee({ feeLabel: '£144.5m–£201.2m', marketValueEur: null })).toBe('£144.5m');
  });

  it('should shorten loan and free transfers', () => {
    expect(shortFee({ feeLabel: 'Loan + option to buy', marketValueEur: null })).toBe('Loan');
    expect(shortFee({ feeLabel: 'Free transfer', marketValueEur: null })).toBe('Free');
  });

  it('should fall back to the market value when there is no fee', () => {
    expect(shortFee({ feeLabel: null, marketValueEur: 38_300_000 })).toBe('€38M');
  });

  it('should show a dash when neither is known', () => {
    expect(shortFee({ feeLabel: null, marketValueEur: null })).toBe('-');
  });
});

describe('formatTransferDigest()', () => {
  it('should group rumours into a section per status', () => {
    const message = formatTransferDigest([makeRumour({ status: 'confirmed' }), makeRumour({ rumourId: 'other', status: 'rumour' })]);

    expect(message).toContain('✅ Confirmed');
    expect(message).toContain('💬 Rumours');
  });

  it('should include the probability column in every section', () => {
    const message = formatTransferDigest([makeRumour({ status: 'confirmed', probability: 100 })]);

    expect(message).toContain('| Player | Move | Fee | % |');
    expect(message).toContain('100%');
  });

  it('should separate each table from its heading so Telegram parses it as a table', () => {
    const message = formatTransferDigest([makeRumour({ status: 'confirmed' })]);

    expect(message).toContain('**✅ Confirmed**\n\n| Player | Move | Fee | % |');
  });

  it('should not render a section that has no rumours', () => {
    const message = formatTransferDigest([makeRumour({ status: 'confirmed' })]);

    expect(message).not.toContain('❌ Collapsed');
  });

  it('should sort a section by probability, highest first', () => {
    const message = formatTransferDigest([makeRumour({ rumourId: 'low', playerName: 'Low', probability: 30 }), makeRumour({ rumourId: 'high', playerName: 'High', probability: 90 })]);

    expect(message.indexOf('High')).toBeLessThan(message.indexOf('Low'));
  });

  it('should link the player name to the source when there is one', () => {
    const message = formatTransferDigest([makeRumour({ sourceUrl: 'https://example.com/report' })]);

    expect(message).toContain('[Player One](https://example.com/report)');
  });

  it('should escape pipes so they do not break the table', () => {
    const message = formatTransferDigest([makeRumour({ playerName: 'Odd | Name' })]);

    expect(message).toContain('Odd \\| Name');
  });
});

describe('formatTransferDigestFallback()', () => {
  it('should render grouped two-line cards without table syntax', () => {
    const [message] = formatTransferDigestFallback([
      makeRumour({
        status: 'confirmed',
        probability: 100,
        feeLabel: '£28.9m–£34m',
        playerName: 'Ousmane Diomande',
        fromClub: 'Sporting CP',
        toClub: 'Nottingham Forest',
      }),
    ]);

    expect(message).toContain('✅ Confirmed (1)');
    expect(message).toContain('• Ousmane Diomande · 100% · £28.9m');
    expect(message).toContain("  Sporting → Nott'm Forest");
    expect(message).not.toContain('| Player |');
    expect(message).not.toContain('|:--|');
  });

  it('should keep probability in every section', () => {
    const messages = formatTransferDigestFallback([
      makeRumour({ rumourId: 'confirmed', status: 'confirmed', probability: 100 }),
      makeRumour({ rumourId: 'collapsed', status: 'collapsed', probability: 2 }),
    ]);
    const message = messages.join('\n');

    expect(message).toContain('Player One · 100%');
    expect(message).toContain('Player One · 2%');
  });

  it('should split large digests without dropping players', () => {
    const rumours = Array.from({ length: 100 }, (_, index) =>
      makeRumour({
        rumourId: `player-${index}`,
        playerName: `Player ${index}`,
        fromClub: `Very Long Selling Club ${index}`,
        toClub: `Very Long Buying Club ${index}`,
      }),
    );

    const messages = formatTransferDigestFallback(rumours);

    expect(messages.length).toBeGreaterThan(1);
    expect(messages.every((message) => message.length <= 3900)).toBe(true);
    for (let index = 0; index < rumours.length; index += 1) {
      expect(messages.join('\n')).toContain(`Player ${index} ·`);
    }
  });
});

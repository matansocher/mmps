import { describe, expect, it } from 'vitest';
import { budgetForOverall, canAfford, canSign, decideOnBid, openWindowForMatchday, windowKey } from './logic';

describe('openWindowForMatchday()', () => {
  it.each([
    { md: 1, name: 'summer' },
    { md: 4, name: 'summer' },
    { md: 19, name: 'winter' },
    { md: 22, name: 'winter' },
  ])('matchday $md is inside the $name window', ({ md, name }) => {
    expect(openWindowForMatchday(md)?.name).toEqual(name);
  });

  it.each([{ md: 5 }, { md: 18 }, { md: 23 }, { md: 38 }])('matchday $md is closed', ({ md }) => {
    expect(openWindowForMatchday(md)).toBeNull();
  });
});

describe('windowKey()', () => {
  it('is season+window scoped when open', () => {
    expect(windowKey(2, 3)).toEqual('2:summer');
    expect(windowKey(2, 20)).toEqual('2:winter');
  });

  it('is null when closed', () => {
    expect(windowKey(1, 10)).toBeNull();
  });
});

describe('budgetForOverall()', () => {
  it.each([
    { ovr: 85, expected: 200_000_000 },
    { ovr: 82, expected: 120_000_000 },
    { ovr: 79, expected: 70_000_000 },
    { ovr: 76, expected: 40_000_000 },
    { ovr: 70, expected: 20_000_000 },
  ])('overall $ovr -> $expected', ({ ovr, expected }) => {
    expect(budgetForOverall(ovr)).toEqual(expected);
  });
});

describe('decideOnBid()', () => {
  it('accepts a bid at or above the value floor', () => {
    expect(decideOnBid({ bidAmount: 90, playerValue: 100, sellerSquadSize: 25 }).outcome).toEqual('accept');
  });

  it('counters a close-but-low bid', () => {
    const d = decideOnBid({ bidAmount: 70, playerValue: 100, sellerSquadSize: 25 });
    expect(d.outcome).toEqual('counter');
    expect(d.counterAmount).toEqual(110);
  });

  it('rejects a far-too-low bid', () => {
    expect(decideOnBid({ bidAmount: 30, playerValue: 100, sellerSquadSize: 25 }).outcome).toEqual('reject');
  });

  it('refuses to sell when the squad is too thin', () => {
    expect(decideOnBid({ bidAmount: 200, playerValue: 100, sellerSquadSize: 16 }).outcome).toEqual('reject');
  });
});

describe('canSign()', () => {
  it('allows signings under the cap and blocks at the cap', () => {
    expect(canSign(3)).toBe(true);
    expect(canSign(4)).toBe(false);
  });
});

describe('canAfford()', () => {
  it('checks budget against a fee', () => {
    expect(canAfford(100, 100)).toBe(true);
    expect(canAfford(99, 100)).toBe(false);
  });
});

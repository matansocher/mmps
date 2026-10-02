import { describe, expect, it, test } from 'vitest';
import type { Country } from '../types';
import { bestScoreKey, questionPool } from './modes';

const country = (code: string, continent: string, area: number, neighbours: string[] = []): Country => ({ code, name: code, flag: '', continent, area, neighbours, polygons: [] });

const COUNTRIES = [country('FR', 'Europe', 550_000, ['BE', 'DE']), country('VA', 'Europe', 1), country('KE', 'Africa', 580_000, ['TZ']), country('BR', 'South America', 8_500_000, ['AR', 'PE'])];

describe('questionPool()', () => {
  test.each([
    { mode: { kind: 'classic' } as const, expected: ['FR', 'KE', 'BR'] },
    { mode: { kind: 'time-attack' } as const, expected: ['FR', 'KE', 'BR'] },
    { mode: { kind: 'continent', continent: 'Europe' } as const, expected: ['FR'] },
    { mode: { kind: 'neighbours' } as const, expected: ['FR', 'BR'] },
  ])('should pick $expected for $mode.kind', ({ mode, expected }) => {
    expect(questionPool(COUNTRIES, mode).map((c) => c.code)).toEqual(expected);
  });
});

describe('bestScoreKey()', () => {
  it('should keep a separate best per continent', () => {
    expect(bestScoreKey({ kind: 'continent', continent: 'Asia' })).toEqual('best:continent:Asia');
    expect(bestScoreKey({ kind: 'classic' })).toEqual('best:classic');
  });
});

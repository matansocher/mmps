import { describe, expect, it } from 'vitest';
import type { GameLog } from '@shared/worldly';
import { generateStatisticsMessage } from './generate-special-message';

describe('localized statistics', () => {
  it.each(['en', 'he'] as const)('renders all labels in %s', (language) => {
    const logs = [{ createdAt: new Date(), correct: 'France', selected: 'France' }] as GameLog[];
    const text = generateStatisticsMessage(logs, language);
    expect(text).toContain('1/1');
    expect(text).toContain('100.00%');
    expect(text).toContain(language === 'he' ? 'היום:' : 'Today:');
    expect(text).toContain(language === 'he' ? 'רצף התשובות הנכונות הנוכחי:' : 'Current correct-answer streak:');
    expect(text).toContain(language === 'he' ? 'רצף הימים הכי ארוך:' : 'Longest daily streak:');
    if (language === 'en') expect(text).not.toMatch(/[א-ת]/);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { LOGIC_MAX_GUESSES } from '@shared/worldly';
import { getLogicTeaser } from './logic-teaser';

vi.mock('@shared/worldly', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shared/worldly')>()),
  getAllCountries: vi.fn().mockResolvedValue([]),
}));

describe('Earth Logic teaser languages', () => {
  it.each(['en', 'he'] as const)('renders the same daily puzzle in %s', async (language) => {
    const teaser = await getLogicTeaser(new Date('2026-10-15T10:00:00Z'), language);
    expect(teaser.text).toContain(language === 'he' ? 'יש מדינה אחת מסתורית' : 'There is one mystery country');
    expect(teaser.text).toContain(String(LOGIC_MAX_GUESSES));
    expect(teaser.keyboard.inline_keyboard[0][0].text).toEqual(language === 'he' ? '🧩 פתרו את החידה' : '🧩 Solve the puzzle');
    expect(teaser.keyboard.inline_keyboard[0][0]).toMatchObject({ web_app: { url: expect.stringContaining('?mode=logic&day=2026-10-15') } });
  });
});

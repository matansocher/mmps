import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserLanguage, saveGameLog } from '@shared/worldly';
import { buildQuestion } from './question-builder';

const { countries, states } = vi.hoisted(() => ({
  countries: [
    { name: 'France', hebrewName: 'צרפת', capital: 'Paris', hebrewCapital: 'פריז', emoji: '🇫🇷', alpha2: 'FR', continent: 'Europe', lat: 48, lon: 2, geometry: {} },
    { name: 'Germany', hebrewName: 'גרמניה', capital: 'Berlin', hebrewCapital: 'ברלין', emoji: '🇩🇪', alpha2: 'DE', continent: 'Europe', lat: 52, lon: 13, geometry: {} },
  ],
  states: [
    { name: 'Texas', hebrewName: 'טקסס', alpha2: 'TX', lat: 31, lon: -100, geometry: {} },
    { name: 'Oklahoma', hebrewName: 'אוקלהומה', alpha2: 'OK', lat: 35, lon: -97, geometry: {} },
  ],
}));

vi.mock('@shared/worldly', () => ({
  getUserLanguage: vi.fn(),
  getAllCountries: vi.fn().mockResolvedValue(countries),
  getAllStates: vi.fn().mockResolvedValue(states),
  getRandomCountry: vi.fn().mockResolvedValue(countries[0]),
  getRandomState: vi.fn().mockResolvedValue(states[0]),
  saveGameLog: vi.fn(),
}));

// Image generation is not involved in building a question.
vi.mock('./utils', async () => await import('./utils/get-distractors'));

describe('bilingual question builder', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['en', 'he'] as const)('localizes every quiz mode in %s without changing answer IDs', async (language) => {
    vi.mocked(getUserLanguage).mockResolvedValue(language);
    for (const mode of ['map', 'us_map', 'flag', 'capital'] as const) {
      const question = await buildQuestion(mode, 123);
      const source = mode === 'us_map' ? states : countries;
      const expectedLabels = source.map((area) =>
        mode === 'capital'
          ? language === 'he'
            ? countries.find((country) => country.name === area.name).hebrewCapital
            : countries.find((country) => country.name === area.name).capital
          : language === 'he'
            ? area.hebrewName
            : area.name,
      );
      expect(question.options.map(({ label }) => label).sort()).toEqual(expectedLabels.sort());
      expect(question.correct.id).toEqual(mode === 'capital' ? 'פריז' : source[0].name);
      expect(saveGameLog).toHaveBeenLastCalledWith(expect.objectContaining({ chatId: 123, correct: question.correct.id }));
      if (mode !== 'flag') expect(question.captionText).toContain(language === 'he' ? 'נחשו' : 'Guess');
    }
  });
});

import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  candidatesFor,
  dailyNumber,
  generateLogicPuzzle,
  LOGIC_DIFFICULTIES,
  LOGIC_MAX_CLUES,
  LOGIC_MIN_ANSWER_AREA_KM2,
  LOGIC_MIN_CLUES,
  type LogicClue,
  logicClueText,
  type LogicCountry,
  logicDifficultyOf,
} from './logic-puzzle';

const countries: LogicCountry[] = JSON.parse(readFileSync(path.resolve('apps/earth-web/public/data/countries.json'), 'utf8'));

function addDays(day: string, offset: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

const YEAR = Array.from({ length: 365 }, (_, i) => addDays('2026-01-01', i));

describe('dailyNumber()', () => {
  test.each([
    { day: '2026-01-01', expected: 1 },
    { day: '2026-02-01', expected: 32 },
    { day: '2027-01-01', expected: 366 },
  ])('should return $expected for $day', ({ day, expected }) => {
    expect(dailyNumber(day)).toEqual(expected);
  });
});

describe('generateLogicPuzzle()', () => {
  test('should be deterministic per day', () => {
    expect(generateLogicPuzzle('2026-03-14', countries)).toEqual(generateLogicPuzzle('2026-03-14', countries));
  });

  test.each(LOGIC_DIFFICULTIES)('should build a solvable, progressively narrowing %s puzzle every day of the year', (difficulty) => {
    for (const day of YEAR) {
      const puzzle = generateLogicPuzzle(day, countries, difficulty);
      expect(logicDifficultyOf(puzzle.answer)).toEqual(difficulty);
      expect(puzzle.clues.length).toBeGreaterThanOrEqual(LOGIC_MIN_CLUES);
      expect(puzzle.clues.length).toBeLessThanOrEqual(LOGIC_MAX_CLUES);
      expect(candidatesFor(puzzle.clues, countries).map(({ code }) => code)).toEqual([puzzle.answer]);
      expect(candidatesFor(puzzle.clues.slice(0, 1), countries).length).toBeGreaterThan(1);
      let previous = countries.length;
      for (let i = 1; i <= puzzle.clues.length; i++) {
        const size = candidatesFor(puzzle.clues.slice(0, i), countries).length;
        expect(size).toBeLessThan(previous);
        previous = size;
      }
    }
  });

  test('should keep the medium puzzle as the default daily puzzle', () => {
    expect(generateLogicPuzzle('2026-03-14', countries)).toEqual(generateLogicPuzzle('2026-03-14', countries, 'medium'));
  });

  test('should vary the answer across days', () => {
    const answers = new Set(YEAR.slice(0, 30).map((day) => generateLogicPuzzle(day, countries).answer));
    expect(answers.size).toBeGreaterThan(20);
  });
});

describe('logicDifficultyOf()', () => {
  test.each([
    { code: 'US', expected: 'easy' },
    { code: 'HU', expected: 'medium' },
    { code: 'BT', expected: 'hard' },
  ])('should rate $code as $expected', ({ code, expected }) => {
    expect(logicDifficultyOf(code)).toEqual(expected);
  });

  test('should only list countries that can be answers, with enough of each tier', () => {
    const eligible = countries.filter(({ area }) => area >= LOGIC_MIN_ANSWER_AREA_KM2);
    const counts = Object.fromEntries(LOGIC_DIFFICULTIES.map((difficulty) => [difficulty, eligible.filter(({ code }) => logicDifficultyOf(code) === difficulty).length]));
    expect(counts.easy).toBeGreaterThanOrEqual(40);
    expect(counts.medium).toBeGreaterThanOrEqual(40);
    expect(counts.hard).toBeGreaterThanOrEqual(40);
  });
});

describe('logicClueText()', () => {
  const nameOf = (code: string) => ({ FR: 'France' })[code] ?? code;

  test.each<{ clue: LogicClue; en: string; he: string }>([
    { clue: { kind: 'continent', continent: 'Europe' }, en: 'It’s in Europe.', he: 'היא נמצאת באירופה.' },
    { clue: { kind: 'border-count', count: 0 }, en: 'It has no land borders.', he: 'אין לה גבולות יבשתיים.' },
    { clue: { kind: 'border-count', count: 3 }, en: 'It borders exactly 3 countries.', he: 'היא גובלת בדיוק ב-3 מדינות.' },
    { clue: { kind: 'borders', code: 'FR' }, en: 'It shares a land border with France.', he: 'יש לה גבול יבשתי עם France.' },
    { clue: { kind: 'area-vs', code: 'FR', bigger: false }, en: 'It’s smaller than France.', he: 'היא קטנה יותר מFrance.' },
    { clue: { kind: 'first-letter', letter: 'P' }, en: 'Its name starts with “P”.', he: 'השם שלה באנגלית מתחיל באות P.' },
    { clue: { kind: 'name-length', length: 5 }, en: 'Its name has 5 letters.', he: 'בשם שלה באנגלית יש 5 אותיות.' },
  ])('should render $clue.kind', ({ clue, en, he }) => {
    expect(logicClueText(clue, 'en', nameOf)).toEqual(en);
    expect(logicClueText(clue, 'he', nameOf)).toEqual(he);
  });
});

// Earth Logic: one hidden country per day and difficulty, deduced from clues.
// Pure and dependency-free so both the Earth mini-app and the Worldly bot generate the identical puzzle.

export type LogicCountry = {
  readonly code: string; // alpha2
  readonly name: string;
  readonly continent: string;
  readonly area: number; // km²
  readonly neighbours: readonly string[]; // land-border codes
};

export type LogicClue =
  | { readonly kind: 'continent'; readonly continent: string }
  | { readonly kind: 'border-count'; readonly count: number } // 0 = no land borders
  | { readonly kind: 'borders'; readonly code: string }
  | { readonly kind: 'area-vs'; readonly code: string; readonly bigger: boolean }
  | { readonly kind: 'first-letter'; readonly letter: string }
  | { readonly kind: 'last-letter'; readonly letter: string }
  | { readonly kind: 'name-length'; readonly length: number };

export const LOGIC_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export type LogicDifficulty = (typeof LOGIC_DIFFICULTIES)[number];

export type LogicPuzzle = {
  readonly day: string; // Format: "YYYY-MM-DD"
  readonly difficulty: LogicDifficulty;
  readonly number: number;
  readonly answer: string;
  readonly clues: readonly LogicClue[];
};

export const LOGIC_MAX_GUESSES = 6;
export const LOGIC_MIN_CLUES = 4;
export const LOGIC_MAX_CLUES = 6;
export const LOGIC_MIN_ANSWER_AREA_KM2 = 1000;
const MIN_FIRST_CLUE_CANDIDATES = 10;
const MAX_ATTEMPTS = 400;

// Difficulty only decides which country can be the answer: famous ones are easy, obscure ones hard.
// Any eligible country not listed here is hard.
const EASY_ANSWERS: ReadonlySet<string> = new Set(
  'US CA MX BR AR CL PE CO VE CU GB IE FR DE IT ES PT NL BE CH AT SE NO FI DK IS GR PL RU UA TR EG MA ZA NG KE ET CN JP KR IN ID TH VN PH AU NZ SA IL IR IQ'.split(' '),
);
const MEDIUM_ANSWERS: ReadonlySet<string> = new Set(
  (
    'AF PK BD LK NP MN KZ UZ KP TW MY KH LA MM AE QA KW JO LB SY OM YE AZ AM GE CZ SK HU RO BG RS HR SI BA AL MK ME XK BY LT LV EE LU MD CY ' +
    'DZ TN LY SD GH SN CM CD TZ UG MG ZW ZM AO MZ BO EC UY PY CR PA JM DO HT GT HN NI SV GL PG FJ HK PR'
  ).split(' '),
);

export function logicDifficultyOf(code: string): LogicDifficulty {
  if (EASY_ANSWERS.has(code)) return 'easy';
  return MEDIUM_ANSWERS.has(code) ? 'medium' : 'hard';
}

// Deterministic per-day random, so everyone gets the same daily puzzle.
export function dailyRandom(day: string): () => number {
  let seed = 2166136261;
  for (const char of day) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Daily number, counted from launch.
export function dailyNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 0, 1)) / 86_400_000) + 1;
}

const letters = (name: string) => name.replace(/[^A-Za-z]/g, '');

export function matchesClue(country: LogicCountry, clue: LogicClue, byCode: ReadonlyMap<string, LogicCountry>): boolean {
  switch (clue.kind) {
    case 'continent':
      return country.continent === clue.continent;
    case 'border-count':
      return country.neighbours.length === clue.count;
    case 'borders':
      return country.neighbours.includes(clue.code);
    case 'area-vs': {
      const reference = byCode.get(clue.code);
      if (!reference || reference.code === country.code) return false;
      return clue.bigger ? country.area > reference.area : country.area < reference.area;
    }
    case 'first-letter':
      return letters(country.name).charAt(0).toUpperCase() === clue.letter;
    case 'last-letter':
      return letters(country.name).slice(-1).toLowerCase() === clue.letter;
    case 'name-length':
      return letters(country.name).length === clue.length;
  }
}

export function candidatesFor(clues: readonly LogicClue[], countries: readonly LogicCountry[]): LogicCountry[] {
  const byCode = new Map(countries.map((country) => [country.code, country]));
  return countries.filter((country) => clues.every((clue) => matchesClue(country, clue, byCode)));
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function cluesFor(answer: LogicCountry, countries: readonly LogicCountry[], random: () => number): LogicClue[] {
  const name = letters(answer.name);
  const smaller = shuffle(
    countries.filter((country) => country.area < answer.area),
    random,
  )[0];
  const larger = shuffle(
    countries.filter((country) => country.area > answer.area),
    random,
  )[0];
  const references = [smaller, larger].filter(Boolean).map((reference): LogicClue => ({ kind: 'area-vs', code: reference.code, bigger: answer.area > reference.area }));
  return [
    { kind: 'continent', continent: answer.continent },
    { kind: 'border-count', count: answer.neighbours.length },
    ...answer.neighbours.map((code): LogicClue => ({ kind: 'borders', code })),
    ...references,
    { kind: 'first-letter', letter: name.charAt(0).toUpperCase() },
    { kind: 'last-letter', letter: name.slice(-1).toLowerCase() },
    { kind: 'name-length', length: name.length },
  ];
}

// Walks a shuffled clue list, keeping only clues that narrow the field, until one country is left.
// Clues are then ordered vaguest-first; the result is accepted only if every clue still narrows it.
function tryBuild(answer: LogicCountry, countries: readonly LogicCountry[], random: () => number): LogicClue[] | null {
  let remaining: readonly LogicCountry[] = countries;
  const picked: LogicClue[] = [];
  const byCode = new Map(countries.map((country) => [country.code, country]));
  for (const clue of shuffle(cluesFor(answer, countries, random), random)) {
    const next = remaining.filter((country) => matchesClue(country, clue, byCode));
    if (next.length === remaining.length) continue;
    picked.push(clue);
    remaining = next;
    if (remaining.length === 1) break;
  }
  if (remaining.length !== 1 || picked.length < LOGIC_MIN_CLUES || picked.length > LOGIC_MAX_CLUES) return null;

  const solo = new Map(picked.map((clue) => [clue, candidatesFor([clue], countries).length]));
  const ordered = [...picked].sort((a, b) => solo.get(b)! - solo.get(a)!);
  if (solo.get(ordered[0])! < MIN_FIRST_CLUE_CANDIDATES) return null;

  let size = countries.length;
  for (let i = 1; i <= ordered.length; i++) {
    const nextSize = candidatesFor(ordered.slice(0, i), countries).length;
    if (nextSize >= size) return null;
    size = nextSize;
  }
  return size === 1 ? ordered : null;
}

// Medium keeps the original seed, so it is the Worldly bot's daily puzzle.
export function generateLogicPuzzle(day: string, countries: readonly LogicCountry[], difficulty: LogicDifficulty = 'medium'): LogicPuzzle {
  const random = dailyRandom(difficulty === 'medium' ? `logic:${day}` : `logic:${difficulty}:${day}`);
  const pool = countries.filter((country) => country.area >= LOGIC_MIN_ANSWER_AREA_KM2 && logicDifficultyOf(country.code) === difficulty);
  if (!pool.length) throw new Error('No countries to build a logic puzzle from');
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const answer = pool[Math.floor(random() * pool.length)];
    const clues = tryBuild(answer, countries, random);
    if (clues) return { day, difficulty, number: dailyNumber(day), answer: answer.code, clues };
  }
  throw new Error(`Could not build a logic puzzle for ${day}`);
}

export type LogicLanguage = 'en' | 'he';

const HEBREW_CONTINENTS: Readonly<Record<string, string>> = {
  Africa: 'אפריקה',
  Asia: 'אסיה',
  Europe: 'אירופה',
  'North America': 'צפון אמריקה',
  'South America': 'דרום אמריקה',
  Oceania: 'אוקיאניה',
};

function englishClue(clue: LogicClue, nameOf: (code: string) => string): string {
  switch (clue.kind) {
    case 'continent':
      return `It’s in ${clue.continent}.`;
    case 'border-count':
      if (clue.count === 0) return 'It has no land borders.';
      return clue.count === 1 ? 'It borders exactly 1 country.' : `It borders exactly ${clue.count} countries.`;
    case 'borders':
      return `It shares a land border with ${nameOf(clue.code)}.`;
    case 'area-vs':
      return `It’s ${clue.bigger ? 'bigger' : 'smaller'} than ${nameOf(clue.code)}.`;
    case 'first-letter':
      return `Its name starts with “${clue.letter}”.`;
    case 'last-letter':
      return `Its name ends with “${clue.letter}”.`;
    case 'name-length':
      return `Its name has ${clue.length} letters.`;
  }
}

function hebrewClue(clue: LogicClue, nameOf: (code: string) => string): string {
  switch (clue.kind) {
    case 'continent':
      return `היא נמצאת ב${HEBREW_CONTINENTS[clue.continent] ?? clue.continent}.`;
    case 'border-count':
      if (clue.count === 0) return 'אין לה גבולות יבשתיים.';
      return clue.count === 1 ? 'היא גובלת במדינה אחת בלבד.' : `היא גובלת בדיוק ב-${clue.count} מדינות.`;
    case 'borders':
      return `יש לה גבול יבשתי עם ${nameOf(clue.code)}.`;
    case 'area-vs':
      return `היא ${clue.bigger ? 'גדולה' : 'קטנה'} יותר מ${nameOf(clue.code)}.`;
    case 'first-letter':
      return `השם שלה באנגלית מתחיל באות ${clue.letter}.`;
    case 'last-letter':
      return `השם שלה באנגלית נגמר באות ${clue.letter}.`;
    case 'name-length':
      return `בשם שלה באנגלית יש ${clue.length} אותיות.`;
  }
}

export function logicClueText(clue: LogicClue, language: LogicLanguage, nameOf: (code: string) => string): string {
  return language === 'he' ? hebrewClue(clue, nameOf) : englishClue(clue, nameOf);
}

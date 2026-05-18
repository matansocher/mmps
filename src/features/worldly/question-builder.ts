import { generateRandomString, shuffleArray } from '@core/utils';
import { Country, getAllCountries, getAllStates, getRandomCountry, getRandomState, saveGameLog, State } from '@shared/worldly';
import { getCapitalDistractors, getFlagDistractors, getMapDistractors, getMapStateDistractors } from './utils';
import { ANALYTIC_EVENT_NAMES } from './worldly.config';

export type QuestionMode = 'map' | 'us_map' | 'flag' | 'capital';

export type QuestionOption = {
  readonly id: string;
  readonly label: string;
};

export type QuestionDescriptor = {
  readonly mode: QuestionMode;
  readonly gameId: string;
  readonly correct: QuestionOption;
  readonly options: ReadonlyArray<QuestionOption>;
  readonly imageAreaName?: string;
  readonly isState?: boolean;
  readonly flagEmoji?: string;
  readonly captionText?: string;
  readonly correctEmoji?: string;
  readonly correctHebrewCapital?: string;
};

const RANDOM_MODES: QuestionMode[] = ['map', 'flag'];

export async function buildQuestion(mode: QuestionMode | 'random', chatId: number): Promise<QuestionDescriptor> {
  const resolved: QuestionMode = mode === 'random' ? RANDOM_MODES[Math.floor(Math.random() * RANDOM_MODES.length)] : mode;
  switch (resolved) {
    case 'map':
      return buildMapQuestion(chatId);
    case 'us_map':
      return buildUSMapQuestion(chatId);
    case 'flag':
      return buildFlagQuestion(chatId);
    case 'capital':
      return buildCapitalQuestion(chatId);
  }
}

async function buildMapQuestion(chatId: number): Promise<QuestionDescriptor> {
  const gameFilter = (c: Country) => !!c.geometry;
  const allCountries = await getAllCountries();
  const correct = await getRandomCountry(gameFilter);

  const distractors = getMapDistractors(allCountries, correct);
  const options = shuffleArray([correct, ...distractors]).map<QuestionOption>((c) => ({ id: c.name, label: c.hebrewName }));
  const gameId = generateRandomString(5);

  await saveGameLog({ chatId, gameId, type: ANALYTIC_EVENT_NAMES.MAP, correct: correct.name });

  return {
    mode: 'map',
    gameId,
    correct: { id: correct.name, label: correct.hebrewName },
    options,
    imageAreaName: correct.name,
    isState: false,
    captionText: 'נחשו את המדינה',
    correctEmoji: correct.emoji,
  };
}

async function buildUSMapQuestion(chatId: number): Promise<QuestionDescriptor> {
  const gameFilter = (s: State) => !!s.geometry;
  const allStates = await getAllStates();
  const correct = await getRandomState(gameFilter);

  const distractors = getMapStateDistractors(allStates, correct);
  const options = shuffleArray([correct, ...distractors]).map<QuestionOption>((s) => ({ id: s.name, label: s.hebrewName }));
  const gameId = generateRandomString(5);

  await saveGameLog({ chatId, gameId, type: ANALYTIC_EVENT_NAMES.US_MAP, correct: correct.name });

  return {
    mode: 'us_map',
    gameId,
    correct: { id: correct.name, label: correct.hebrewName },
    options,
    imageAreaName: correct.name,
    isState: true,
    captionText: 'נחשו את המדינה בארצות הברית',
  };
}

async function buildFlagQuestion(chatId: number): Promise<QuestionDescriptor> {
  const gameFilter = (c: Country) => !!c.emoji;
  const allCountries = await getAllCountries();
  const correct = await getRandomCountry(gameFilter);

  const distractors = getFlagDistractors(allCountries, correct, gameFilter);
  const options = shuffleArray([correct, ...distractors]).map<QuestionOption>((c) => ({ id: c.name, label: c.hebrewName }));
  const gameId = generateRandomString(5);

  await saveGameLog({ chatId, gameId, type: ANALYTIC_EVENT_NAMES.FLAG, correct: correct.name });

  return {
    mode: 'flag',
    gameId,
    correct: { id: correct.name, label: correct.hebrewName },
    options,
    flagEmoji: correct.emoji,
    correctEmoji: correct.emoji,
  };
}

async function buildCapitalQuestion(chatId: number): Promise<QuestionDescriptor> {
  const gameFilter = (c: Country) => !!c.capital;
  const allCountries = await getAllCountries();
  const correct = await getRandomCountry(gameFilter);

  const distractors = getCapitalDistractors(allCountries, correct, gameFilter);
  const options = shuffleArray([correct, ...distractors]).map<QuestionOption>((c) => ({ id: c.hebrewCapital, label: c.hebrewCapital }));
  const gameId = generateRandomString(5);

  await saveGameLog({ chatId, gameId, type: ANALYTIC_EVENT_NAMES.CAPITAL, correct: correct.name });

  return {
    mode: 'capital',
    gameId,
    correct: { id: correct.hebrewCapital, label: correct.hebrewCapital },
    options,
    captionText: `נחשו את עיר הבירה של: ${correct.emoji} ${correct.hebrewName} ${correct.emoji}`,
    correctEmoji: correct.emoji,
    correctHebrewCapital: correct.hebrewCapital,
  };
}

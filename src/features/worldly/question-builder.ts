import { generateRandomString, shuffleArray } from '@core/utils';
import { Country, getAllCountries, getAllStates, getRandomCountry, getRandomState, getUserLanguage, saveGameLog, State, type WorldlyLanguage } from '@shared/worldly';
import { areaName, capitalName, worldlyText } from './language';
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
  const language = await getUserLanguage(chatId);
  const resolved: QuestionMode = mode === 'random' ? RANDOM_MODES[Math.floor(Math.random() * RANDOM_MODES.length)] : mode;
  switch (resolved) {
    case 'map':
      return buildMapQuestion(chatId, language);
    case 'us_map':
      return buildUSMapQuestion(chatId, language);
    case 'flag':
      return buildFlagQuestion(chatId, language);
    case 'capital':
      return buildCapitalQuestion(chatId, language);
  }
}

async function buildMapQuestion(chatId: number, language: WorldlyLanguage): Promise<QuestionDescriptor> {
  const gameFilter = (c: Country) => !!c.geometry;
  const allCountries = await getAllCountries();
  const correct = await getRandomCountry(gameFilter);

  const distractors = getMapDistractors(allCountries, correct);
  const options = shuffleArray([correct, ...distractors]).map<QuestionOption>((c) => ({ id: c.name, label: areaName(c, language) }));
  const gameId = generateRandomString(5);

  await saveGameLog({ chatId, gameId, type: ANALYTIC_EVENT_NAMES.MAP, correct: correct.name });

  return {
    mode: 'map',
    gameId,
    correct: { id: correct.name, label: areaName(correct, language) },
    options,
    imageAreaName: correct.name,
    isState: false,
    captionText: worldlyText(language).guessCountry,
    correctEmoji: correct.emoji,
  };
}

async function buildUSMapQuestion(chatId: number, language: WorldlyLanguage): Promise<QuestionDescriptor> {
  const gameFilter = (s: State) => !!s.geometry;
  const allStates = await getAllStates();
  const correct = await getRandomState(gameFilter);

  const distractors = getMapStateDistractors(allStates, correct);
  const options = shuffleArray([correct, ...distractors]).map<QuestionOption>((s) => ({ id: s.name, label: areaName(s, language) }));
  const gameId = generateRandomString(5);

  await saveGameLog({ chatId, gameId, type: ANALYTIC_EVENT_NAMES.US_MAP, correct: correct.name });

  return {
    mode: 'us_map',
    gameId,
    correct: { id: correct.name, label: areaName(correct, language) },
    options,
    imageAreaName: correct.name,
    isState: true,
    captionText: worldlyText(language).guessState,
  };
}

async function buildFlagQuestion(chatId: number, language: WorldlyLanguage): Promise<QuestionDescriptor> {
  const gameFilter = (c: Country) => !!c.emoji;
  const allCountries = await getAllCountries();
  const correct = await getRandomCountry(gameFilter);

  const distractors = getFlagDistractors(allCountries, correct, gameFilter);
  const options = shuffleArray([correct, ...distractors]).map<QuestionOption>((c) => ({ id: c.name, label: areaName(c, language) }));
  const gameId = generateRandomString(5);

  await saveGameLog({ chatId, gameId, type: ANALYTIC_EVENT_NAMES.FLAG, correct: correct.name });

  return {
    mode: 'flag',
    gameId,
    correct: { id: correct.name, label: areaName(correct, language) },
    options,
    flagEmoji: correct.emoji,
    correctEmoji: correct.emoji,
  };
}

async function buildCapitalQuestion(chatId: number, language: WorldlyLanguage): Promise<QuestionDescriptor> {
  const gameFilter = (c: Country) => !!c.capital;
  const allCountries = await getAllCountries();
  const correct = await getRandomCountry(gameFilter);

  const distractors = getCapitalDistractors(allCountries, correct, gameFilter);
  const options = shuffleArray([correct, ...distractors]).map<QuestionOption>((c) => ({ id: c.hebrewCapital, label: capitalName(c, language) }));
  const gameId = generateRandomString(5);

  // Keep historical capital callback IDs stable across language changes.
  await saveGameLog({ chatId, gameId, type: ANALYTIC_EVENT_NAMES.CAPITAL, correct: correct.hebrewCapital });

  return {
    mode: 'capital',
    gameId,
    correct: { id: correct.hebrewCapital, label: capitalName(correct, language) },
    options,
    captionText: `${worldlyText(language).guessCapital} ${correct.emoji} ${areaName(correct, language)} ${correct.emoji}`,
    correctEmoji: correct.emoji,
    correctHebrewCapital: correct.hebrewCapital,
  };
}

import { formatInTimeZone } from 'date-fns-tz';
import { InlineKeyboard } from 'grammy';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_TIMEZONE } from '@core/config';
import { generateLogicPuzzle, getAllCountries, LOGIC_MAX_GUESSES, type LogicCountry, logicClueText } from '@shared/worldly';
import { GLOBE_APP_URL } from '../worldly.config';

const COUNTRIES_PATH = path.resolve('apps/earth-web/public/data/countries.json');

let logicCountries: readonly LogicCountry[] | null = null;

// The mini app's country file is the puzzle source, so the bot and the globe generate the same daily puzzle.
function getLogicCountries(): readonly LogicCountry[] {
  if (!logicCountries) {
    const raw: LogicCountry[] = JSON.parse(fs.readFileSync(COUNTRIES_PATH, 'utf8'));
    logicCountries = raw.map(({ code, name, continent, area, neighbours }) => ({ code, name, continent, area, neighbours }));
  }
  return logicCountries;
}

export type LogicTeaser = {
  readonly text: string;
  readonly keyboard: InlineKeyboard;
};

export async function getLogicTeaser(date = new Date()): Promise<LogicTeaser> {
  const day = formatInTimeZone(date, DEFAULT_TIMEZONE, 'yyyy-MM-dd');
  const countries = getLogicCountries();
  const puzzle = generateLogicPuzzle(day, countries);
  const hebrewNames = new Map((await getAllCountries()).map(({ alpha2, hebrewName }) => [alpha2, hebrewName]));
  const englishNames = new Map(countries.map(({ code, name }) => [code, name]));
  const nameOf = (code: string) => hebrewNames.get(code) ?? englishNames.get(code) ?? code;

  const text = [
    `🧩 Earth Logic #${puzzle.number}`,
    '',
    'יש מדינה אחת מסתורית. הנה הרמז הראשון:',
    `1️⃣ ${logicClueText(puzzle.clues[0], 'he', nameOf)}`,
    '',
    `עוד רמז על כל ניחוש שגוי, ${LOGIC_MAX_GUESSES} ניחושים בסך הכל. מצאו אותה על הגלובוס 👇`,
  ].join('\n');
  const keyboard = new InlineKeyboard().webApp('🧩 פתרו את החידה', `${GLOBE_APP_URL}?mode=logic&day=${day}`);
  return { text, keyboard };
}

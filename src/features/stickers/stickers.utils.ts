import type { StatCount } from './types';

// An emoji with its skin tones and variation selectors, joined by ZWJ into one sequence (👍🏽, 👨‍👩‍👧, ❤️‍🔥), or a flag (🇮🇱)
const EMOJI = String.raw`\p{Extended_Pictographic}[\p{Emoji_Modifier}\uFE0F]*(?:\u200D\p{Extended_Pictographic}[\p{Emoji_Modifier}\uFE0F]*)*|\p{Regional_Indicator}{2}`;
// Dots count as word characters anywhere (ת.ז, 3.5, "."); a word may hold a geresh or gershayim between letters (עו״ד, don't)
// and a Hebrew word may also end with a geresh (ג׳ורג׳)
const WORD = String.raw`[\p{L}\p{N}.]+(?:['"’”׳״][\p{L}\p{N}.]+)*(?:(?<=\p{Script=Hebrew})['’׳])?`;
const TOKEN_REGEX = new RegExp(`${WORD}|${EMOJI}`, 'gu');
const HEBREW_REGEX = /\p{Script=Hebrew}/u;

// Phone keyboards type ' and " instead of ׳ and ״, so Hebrew words use the Hebrew marks and others the plain ' (ג'ורג' -> ג׳ורג׳)
function normalizePunctuation(token: string): string {
  if (HEBREW_REGEX.test(token)) return token.replace(/['’]/g, '׳').replace(/["”]/g, '״');
  return token.replace(/[’׳]/g, "'").replace(/[”״]/g, '"');
}

// Lowercased, de-duplicated words in any script (Hebrew, English, digits) and emojis, each emoji its own token,
// e.g. "Funny, CAT!! #lol 😂😂" -> ["funny", "cat", "lol", "😂"]. U+FE0F is dropped so "❤" and "❤️" match.
export function tokenize(text: string): string[] {
  const tokens = [...text.toLowerCase().matchAll(TOKEN_REGEX)].map(([token]) => normalizePunctuation(token.replace(/\uFE0F/g, '')));
  return [...new Set(tokens)];
}

export type TagEdits = {
  readonly add: string[];
  readonly remove: string[];
};

// Words with a leading or trailing "-" remove a tag, e.g. "cat -dog night-" -> { add: ["cat"], remove: ["dog", "night"] }
export function parseTagEdits(text: string): TagEdits {
  const add = new Set<string>();
  const remove = new Set<string>();
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const target = word.startsWith('-') || word.endsWith('-') ? remove : add;
    tokenize(word).forEach((tag) => target.add(tag));
  }
  return { add: [...add].filter((tag) => !remove.has(tag)), remove: [...remove] };
}

export type StepTimer = {
  readonly time: <T>(step: string, run: () => Promise<T>) => Promise<T>;
  readonly elapsedMs: () => number;
  readonly summary: () => string;
};

// Records how long each awaited step took, in order, e.g. "search=42ms upload=812ms send=391ms total=1250ms"
export function createStepTimer(now: () => number = Date.now): StepTimer {
  const startedAt = now();
  const steps: string[] = [];
  return {
    time: async (step, run) => {
      const stepStartedAt = now();
      try {
        return await run();
      } finally {
        steps.push(`${step}=${now() - stepStartedAt}ms`);
      }
    },
    elapsedMs: () => now() - startedAt,
    summary: () => [...steps, `total=${now() - startedAt}ms`].join(' '),
  };
}

export type StickerStats = {
  readonly topTags: StatCount[];
  readonly topWords: StatCount[];
  readonly topSearchers: StatCount[];
};

function formatSection(title: string, items: string[], fallback: string): string {
  const lines = items.length ? items.map((item, i) => `${i + 1}. ${item}`) : [fallback];
  return [title, ...lines].join('\n');
}

export function formatStatsMessage({ topTags, topWords, topSearchers }: StickerStats): string {
  return [
    '📊 *סטטיסטיקות*',
    formatSection(
      '🏷️ *מילות החיפוש הנפוצות בסטיקרים*',
      topTags.map(({ value, count }) => `${value} (${count})`),
      'אין עדיין מילות חיפוש.',
    ),
    formatSection(
      '🔎 *המילים שחיפשו הכי הרבה*',
      topWords.map(({ value, count }) => `${value} (${count})`),
      'אין עדיין חיפושים.',
    ),
    formatSection(
      '🏆 *המחפשים המובילים*',
      topSearchers.map(({ value, count }) => `${value} — ${count} חיפושים`),
      'אין עדיין מחפשים.',
    ),
  ].join('\n\n');
}

// An emoji with its skin tones and variation selectors, joined by ZWJ into one sequence (👍🏽, 👨‍👩‍👧, ❤️‍🔥), or a flag (🇮🇱)
const EMOJI = String.raw`\p{Extended_Pictographic}[\p{Emoji_Modifier}\uFE0F]*(?:\u200D\p{Extended_Pictographic}[\p{Emoji_Modifier}\uFE0F]*)*|\p{Regional_Indicator}{2}`;
const TOKEN_REGEX = new RegExp(String.raw`[\p{L}\p{N}]+|${EMOJI}`, 'gu');

// Lowercased, de-duplicated words in any script (Hebrew, English, digits) and emojis, each emoji its own token,
// e.g. "Funny, CAT!! #lol 😂😂" -> ["funny", "cat", "lol", "😂"]. U+FE0F is dropped so "❤" and "❤️" match.
export function tokenize(text: string): string[] {
  const tokens = [...text.toLowerCase().matchAll(TOKEN_REGEX)].map(([token]) => token.replace(/\uFE0F/g, ''));
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

import { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'TIKTOK',
  name: 'Tiktok Bot',
  token: 'TIKTOK_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'start over', hide: true },
    LIST: { command: '/list', description: 'list of channels' },
  },
};

export const BOT_ACTIONS = {
  REMOVE: 'REMOVE',
  SEARCH_VIDEOS: 'SEARCH_VIDEOS',
  LIST: 'LIST',
};

export const INLINE_KEYBOARD_SEPARATOR = '|';

export const SUMMARY_PROMPT = `
You are a helpful assistant that summarizes TikTok video transcripts.
Your task is to create a clear, accurate, and natural summary that captures the main ideas, tone, and key details of the video.

Guidelines:
1. Language: Write the summary in the same language as the original video.
2. Length: Make the summary proportional to the video’s length:
-For short videos (under 30 seconds), summarize in 1–2 sentences.
-For medium videos (30–90 seconds), summarize in 2–4 sentences.
-For longer videos (over 90 seconds), summarize in 3–6 sentences, covering all key points concisely.
3.Style:
- Keep the tone neutral and informative, unless the video’s style is clearly emotional, humorous, or persuasive — in that case, reflect that tone briefly.
- Do not add personal opinions or commentary.
4. Focus: Emphasize the core message, reasoning, and outcome rather than minor details or filler phrases.
5. Output: Return only the summary — no explanations or notes.
`;

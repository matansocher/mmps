import { Logger } from '@core/utils';
import { getChatCompletion } from '@services/anthropic';
import type { WeeklyDigestNumbers } from './build-weekly-digest-numbers';
import { fallbackWeeklyDigest } from './fallback-weekly-digest';

const logger = new Logger('generateWeeklyDigest');

const SYSTEM_PROMPT = `You write concise, personal weekly expense digests for a single user.
Tone: warm, brief, observational. No moralising, no advice unless a number is genuinely striking.
Output format (Markdown, plain text, no headings, no emojis at the start of lines):
1. A one-sentence narrative summary of the week.
2. Two to three short bullet points (· prefix) highlighting notable patterns: new vendors, biggest categories, comparison to recent weeks or same-week-last-year, anything unusual.
3. Always end with a single line showing the week's total per currency.
Keep the entire message under 90 words. Do not invent numbers — only use what is in the JSON.`;

export async function generateWeeklyDigest(numbers: WeeklyDigestNumbers): Promise<string> {
  const content = `Here is the data for the week. Write the digest.\n\n${JSON.stringify(numbers, null, 2)}`;
  try {
    const result = await getChatCompletion(SYSTEM_PROMPT, content);
    const text = result.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim();
    return text || fallbackWeeklyDigest(numbers);
  } catch (err) {
    logger.error(`LLM digest failed, using fallback: ${err}`);
    return fallbackWeeklyDigest(numbers);
  }
}

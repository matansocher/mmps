export const INITIAL_BOT_RESPONSE = [
  `שלום {firstName}!`,
  `אני בוט שיכול לעזור לך לקבל סיכום של כל החדשות בכל יום`,
  `אפשר להציץ באפשרויות המובנות שלי לפרטים נוספים 😁`,
].join('\n\n');

export const GENERAL_ERROR_MESSAGE = 'נראה שמשהו בלתי צפוי קרה, אנא נסה שוב מאוחר יותר';

export const FUN_FACT_PROMPT = [
  'Give me a fascinating and mind-blowing fact from the worlds of math, science, astronomy, psychology, sports, or any other field of knowledge that sparks curiosity and amazement.',
  "If there's a significant event, discovery, or milestone related to today's date, feel free to include it — but only if it's truly important or interesting.",
  'Prioritize fresh, surprising facts that I probably don’t know yet.',
  'The goal is to make me smarter, broaden my perspective, and give me interesting material to use in conversations.',
  'Keep it concise but impactful, memorable, and something worth sharing with others.',
].join(' ');

export const FUN_FACT_PHOTO_PROMPT = [
  'You are getting a fun fact.',
  'Try to create the best image you can get describing the fact so it is nice to get besides the fact.',
].join(' ');

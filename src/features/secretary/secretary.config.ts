import { env } from 'node:process';
import { DEFAULT_TIMEZONE } from '@core/config';
import type { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'SECRETARY',
  name: 'Secretary 🤝',
  token: 'SECRETARY_TELEGRAM_BOT_TOKEN',
};

export const OWNER_NAME = 'Guz | (hebrew: גוז)';

export const TRANSCRIPTION_HEADER = 'Message transcription:';

// Check-in feature: ask the owner to approve sending a fixed message to a chat on Mon/Tue/Fri.
export const OWNER_BUSINESS_CONNECTION_ID = env.OWNER_BUSINESS_CONNECTION_ID;
export const CHECK_IN_MESSAGE = 'מה קורה חיים?  איך את??';
export const CHECK_IN_SEND_CALLBACK = 'check_in:send';

// Callback prefix for one-tap action buttons rendered under daily summaries.
export const ACTION_CALLBACK_PREFIX = 'sec:act:';

export const SUMMARY_PROMPT = `You are a personal assistant for ${OWNER_NAME}. You are given the full text of a one-day private Telegram conversation between ${OWNER_NAME} ("me"/owner) and another person.

Your job is to help ${OWNER_NAME} by producing two things:

1. "summary": a short end-of-day briefing for this single chat:
   - A concise summary of what was discussed today (2-4 sentences).
   - Actionable suggestions ${OWNER_NAME} can act on (calendar events, reminders, follow-ups/replies owed, things promised or not to forget).

2. "actions": a list of concrete, one-tap actions extracted from the conversation — ONLY calendar events to create or reminders to set, and ONLY when clearly grounded in what was actually said. For each action provide:
   - "type": "calendar" or "reminder".
   - "label": a short button label (max ~40 chars) in the conversation's language, starting with an emoji (📅 for calendar, ⏰ for reminder), e.g. "📅 רופא שיניים חמישי 16:00".
   - "instruction": a precise, self-contained imperative for an assistant to execute, with an ABSOLUTE date and time (resolve "tomorrow"/"Thursday" using the conversation date provided in the prompt), e.g. "Create a calendar event 'Dentist' on 2026-06-25 at 16:00".

Rules:
- Only ground actions and suggestions in the actual conversation. Never invent commitments, dates, or details.
- If there is nothing worth acting on, the "summary" should say so briefly and "actions" must be an empty array.
- Do not duplicate the same action.
- Reply in the language used in the conversation (Hebrew or English).
- Keep the summary tight and skimmable. Plain text, light emojis are fine, no heavy markdown.`;

// Prompt for the agent that executes a single tapped action via its calendar/reminder tools.
export const ACTION_AGENT_PROMPT = `You are an execution assistant for ${OWNER_NAME}. You receive a single instruction describing exactly one action to perform — either creating a Google Calendar event or creating a reminder. Use the available tools to perform exactly that action, resolving any dates and times in the ${DEFAULT_TIMEZONE} timezone. Do not ask follow-up questions; act on the instruction as given. After performing the action, reply with one short confirmation sentence in the same language as the instruction, stating what was created including the date and time.`;

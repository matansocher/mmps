import { env } from 'node:process';
import type { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'CHATBOT',
  name: 'Chatbot 🤖',
  token: 'CHATBOT_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'Start over', hide: true },
  },
};

export const CHATBOT_CONFIG = {
  // Toggle per-turn token/cost observability. Defaults on; set CHATBOT_USAGE_TRACKING=false to disable.
  usageTracking: env.CHATBOT_USAGE_TRACKING !== 'false',
  // Location used by the nightly summary's weather section.
  summaryLocation: env.CHATBOT_SUMMARY_LOCATION || 'Kfar Saba',
  summarization: {
    // Summarize once the retained history grows past this many tokens. Token-based bounding is
    // the primary guard: message counts don't bound context or checkpoint size, since a single
    // retained turn can carry a base64 image or a full transcript. See CHATBOT_SUMMARY_PROMPT.
    triggerTokens: parseInt(env.CHATBOT_SUMMARY_TRIGGER_TOKENS || '24000', 10),
    // Secondary message-count trigger (OR with the token trigger) so very chatty short threads
    // still get compressed even when they stay under the token budget.
    triggerMessages: parseInt(env.CHATBOT_SUMMARY_TRIGGER_MESSAGES || '40', 10),
    // Keep roughly this many tokens of the most recent turns verbatim after summarizing the rest.
    keepTokens: parseInt(env.CHATBOT_SUMMARY_KEEP_TOKENS || '8000', 10),
  },
  // Bounded execution budget for a single turn. A request timeout only covers one model call,
  // and recursionLimit only bounds graph steps — these are the real per-turn ceilings.
  execution: {
    // Max model requests allowed in a single agent run (turn). "end" lets the agent finish gracefully.
    modelCallLimitPerRun: parseInt(env.CHATBOT_MODEL_CALL_LIMIT || '8', 10),
    // Max tool calls allowed in a single agent run. "continue" blocks further tool calls with an
    // error message but lets the model wrap up its answer.
    toolCallLimitPerRun: parseInt(env.CHATBOT_TOOL_CALL_LIMIT || '12', 10),
    // Wall-clock deadline for the whole turn (ms). Aborts the run regardless of where it is.
    turnTimeoutMs: parseInt(env.CHATBOT_TURN_TIMEOUT_MS || '180000', 10),
  },
};

// {messages} is required — the middleware substitutes the messages being summarized there.
export const CHATBOT_SUMMARY_PROMPT = `You are compressing the older part of a personal-assistant conversation so it can replace the original messages while staying within the token budget.

Preserve, above all:
- Durable facts about the user (name, location, family, work, health, diet, schedule).
- Stated preferences, likes/dislikes, and how the user wants the assistant to behave.
- Open tasks, reminders, promises, and anything the assistant still needs to follow up on.
- Decisions already made and actions already taken (so they are not repeated).

Rules:
- Keep it concise but lossless on the points above; drop small talk and resolved chit-chat.
- Preserve the language a fact was expressed in (do not translate Hebrew to English or vice versa).
- Write neutral notes, not a reply to the user.
- Respond ONLY with the extracted context, no preamble or closing text.

<messages>
{messages}
</messages>`;

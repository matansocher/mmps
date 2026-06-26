import { env } from 'node:process';
import type { TelegramBotConfig } from '@services/telegram';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'CHATBOT',
  name: 'Chatbot 🤖',
  token: 'CHATBOT_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'Start over', hide: true },
    HELP: { command: '/help', description: '❓ Show available tools' },
    APP: { command: '/app', description: '📱 Open the app' },
    EXERCISE: { command: '/exercise', description: '💪 Log a workout' },
  },
};

export const CHATBOT_CONFIG = {
  // Toggle per-turn token/cost observability. Defaults on; set CHATBOT_USAGE_TRACKING=false to disable.
  usageTracking: env.CHATBOT_USAGE_TRACKING !== 'false',
  summarization: {
    // Summarize once a thread grows past this many messages.
    triggerMessages: parseInt(env.CHATBOT_SUMMARY_TRIGGER_MESSAGES || '40', 10),
    // Keep this many of the most recent messages verbatim after summarizing the rest.
    keepMessages: parseInt(env.CHATBOT_SUMMARY_KEEP_MESSAGES || '20', 10),
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

export const IMAGE_ANALYSIS_PROMPT = `You are an image analysis assistant. Analyze the image and provide a detailed description of its content, including objects, people, activities, and any relevant context. Be as descriptive and specific as possible in your analysis.`;

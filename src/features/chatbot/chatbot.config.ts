import { env } from 'node:process';

export const BOT_CONFIG = {
  id: 'CHATBOT',
  name: 'Chatbot',
  token: env.CHATBOT_BOT_TOKEN,
  webhookUrl: env.CHATBOT_WEBHOOK_URL,
  description: 'AI-powered chatbot that gathers information from various data sources',
};

export const CHATBOT_CONFIG = {
  maxThreadMessages: parseInt(env.CHATBOT_MAX_THREAD_MESSAGES || '50', 10),
  preserveSystemMessages: true,
  preserveFirstMessage: true,
};

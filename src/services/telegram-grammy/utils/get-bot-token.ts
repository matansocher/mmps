import { env } from 'node:process';

export function getBotToken(botId: string, botToken: string, overrideLocal?: boolean): string | undefined {
  const isProd = env.NODE_ENV === 'production';

  if (isProd || overrideLocal) {
    return botToken;
  }

  if (botId === env.LOCAL_ACTIVE_BOT_ID) {
    return env.PLAYGROUNDS_TELEGRAM_BOT_TOKEN;
  }

  return undefined;
}

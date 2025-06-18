export function getBotToken(botId: string, botToken: string, overrideLocal?: boolean): string | undefined {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd || overrideLocal) {
    return botToken;
  }

  if (botId === process.env.LOCAL_ACTIVE_BOT_ID) {
    return process.env['PLAYGROUNDS_TELEGRAM_BOT_TOKEN'];
  }

  return undefined;
}

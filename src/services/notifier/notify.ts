import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { provideTelegramBot, TelegramBotConfig, UserDetails } from '@services/telegram';

const logger = new Logger('notifier');

const NOTIFIER_CHAT_ID = MY_USER_ID;
const botConfig = {
  id: 'NOTIFIER',
  name: 'Notifier Bot 🦔',
  token: 'NOTIFIER_TELEGRAM_BOT_TOKEN',
  forceLocal: true,
};

type NotifyOptions = {
  readonly [key: string]: any;
  readonly action: string;
  readonly plainText?: string;
};

function getNotyMessageText(botName: string, options: NotifyOptions, userDetails: UserDetails): string {
  const { firstName = '', lastName = '', username = '' } = userDetails || {};
  const { action, plainText, ...otherOptions } = options;
  const sentences = [];
  sentences.push(`bot: ${botName}`);
  userDetails && sentences.push(`name: ${firstName} ${lastName} - ${username}`);
  sentences.push(`action: ${action.replaceAll('_', ' ')}`);
  otherOptions && Object.keys(otherOptions).length && sentences.push(`data: ${JSON.stringify(otherOptions, null, 2)}`);
  plainText && sentences.push(plainText);
  return sentences.join('\n');
}

export function notify(bot: TelegramBotConfig, options: NotifyOptions, userDetails?: UserDetails): void {
  if (userDetails?.chatId === MY_USER_ID) {
    return;
  }
  try {
    const notyMessageText = getNotyMessageText(bot.name, options, userDetails);
    const botInstance = provideTelegramBot(botConfig);
    void botInstance.api.sendMessage(NOTIFIER_CHAT_ID, notyMessageText).catch((err) => logger.error(`Failed to send notification: ${err instanceof Error ? err.message : String(err)}`));
  } catch (err) {
    logger.error(`Failed to build notification: ${err instanceof Error ? err.message : String(err)}`);
  }
}

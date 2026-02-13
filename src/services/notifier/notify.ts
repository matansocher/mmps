import { MY_USER_ID } from '@core/config';
import { provideTelegramBot, TelegramBotConfig, UserDetails } from '@services/telegram';

const NOTIFIER_CHAT_ID = 862305226;
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
  const notyMessageText = getNotyMessageText(bot.name, options, userDetails);
  const botInstance = provideTelegramBot(botConfig);
  botInstance.api.sendMessage(NOTIFIER_CHAT_ID, notyMessageText);
}

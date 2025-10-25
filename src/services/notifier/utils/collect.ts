import { MessageType, NOTIFIER_CHAT_ID } from '@services/notifier';

export async function collect(messageType: MessageType, data: string): Promise<void> {
  try {
    switch (messageType) {
      case MessageType.TEXT:
        await this.bot.sendMessage(NOTIFIER_CHAT_ID, data);
        break;
      case MessageType.PHOTO:
        await this.bot.sendPhoto(NOTIFIER_CHAT_ID, data);
        break;
      case MessageType.AUDIO:
        await this.bot.sendVoice(NOTIFIER_CHAT_ID, data);
        break;
      case MessageType.VIDEO:
        await this.bot.sendVideo(NOTIFIER_CHAT_ID, data);
        break;
    }
  } catch (err) {
    this.logger.error(`${this.collect.name} - err: ${err}`);
  }
}

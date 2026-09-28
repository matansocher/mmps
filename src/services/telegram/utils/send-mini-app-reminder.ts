import { Api } from 'grammy';

// API-only client: reminder delivery must not start a second polling bot.
export async function sendMiniAppReminder(token: string, chatId: number, url: string, message: string): Promise<void> {
  const api = new Api(token, { timeoutSeconds: 15 });
  await api.sendMessage(chatId, message, { reply_markup: { inline_keyboard: [[{ text: 'Play today’s loop', web_app: { url } }]] } });
}

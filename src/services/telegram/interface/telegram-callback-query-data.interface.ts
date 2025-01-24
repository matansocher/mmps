export interface TelegramCallbackQueryData {
  messageId: number;
  callbackQueryId: string;
  chatId: number;
  date: number;
  firstName: string;
  lastName: string;
  text: string;
  data: string;
}

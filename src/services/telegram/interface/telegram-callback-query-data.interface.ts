export interface ITelegramCallbackQueryData {
  callbackQueryId: string;
  chatId: number;
  date: number;
  firstName: string;
  lastName: string;
  text: string;
  data: string;
}

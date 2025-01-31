export interface TelegramCallbackQueryData {
  readonly messageId: number;
  readonly callbackQueryId: string;
  readonly chatId: number;
  readonly date: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly text: string;
  readonly data: string;
}

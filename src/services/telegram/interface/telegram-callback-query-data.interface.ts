import { UserDetails } from './telegram-message-data.interface';

export interface TelegramCallbackQueryData {
  readonly messageId: number;
  readonly callbackQueryId: string;
  readonly chatId: number;
  readonly date: number;
  readonly userDetails: UserDetails;
  readonly text: string;
  readonly data: string;
}

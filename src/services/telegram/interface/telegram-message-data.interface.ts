export interface TelegramMessageData {
  readonly chatId: number;
  readonly messageId: number;
  readonly replyToMessageId: number;
  readonly replyToMessageText: string;
  readonly telegramUserId: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly username: string;
  readonly text: string;
  readonly audio: any;
  readonly video: any;
  readonly photo: any;
  readonly file: any;
  readonly date: number;
}

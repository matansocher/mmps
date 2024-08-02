export interface ITelegramMessageData {
  chatId: number;
  messageId: number;
  replyToMessageId: number;
  replyToMessageText: string;
  telegramUserId: number;
  firstName: string;
  lastName: string;
  username: string;
  text: string;
  audio: any;
  video: any;
  photo: any;
  date: number;
}

export interface UserDetails {
  readonly chatId: number;
  readonly telegramUserId: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly username: string;
}

export interface TelegramMessageData {
  readonly chatId: number;
  readonly messageId: number;
  readonly replyToMessageId: number;
  readonly replyToMessageText: string;
  readonly userDetails: UserDetails;
  readonly text: string;
  readonly audio: any;
  readonly video: any;
  readonly photo: any;
  readonly file: any;
  readonly date: number;
  readonly location: {
    readonly lat: number;
    readonly lon: number;
  };
}

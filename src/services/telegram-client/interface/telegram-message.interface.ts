export interface TelegramMessageBody {
  readonly id: string;
  readonly fromId: { readonly userId: string; readonly className: string };
  readonly peerId: { readonly channelId: string; readonly className: string };
  readonly date: number;
  readonly text: string;
}

export interface TelegramEvent {
  readonly className: string;
  readonly message: TelegramMessageBody;
}

export interface TelegramMessage {
  readonly id: string;
  readonly userId: string;
  readonly channelId: string;
  readonly date: number;
  readonly text: string;
}

export interface ConversationDetails {
  readonly id: string;
  readonly createdDate: number;
  readonly title: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly userName: string;
  readonly photo?: string;
}

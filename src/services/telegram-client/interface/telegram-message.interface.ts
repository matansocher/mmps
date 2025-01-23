export interface TelegramMessageBody {
  id: string;
  fromId: { userId: string; className: string };
  peerId: { channelId: string; className: string };
  date: number;
  text: string;
}

export interface TelegramEvent {
  className: string;
  message: TelegramMessageBody;
}

export interface TelegramMessage {
  id: string;
  userId: string;
  channelId: string;
  date: number;
  text: string;
}

export interface ConversationDetails {
  id: string;
  createdDate: number;
  title: string;
  firstName: string;
  lastName: string;
  userName: string;
  photo?: string;
}

export interface ITelegramMessageBody {
  id: string;
  fromId: { userId: string; className: string };
  peerId: { channelId: string; className: string };
  date: number;
  text: string;
}

export interface ITelegramEvent {
  className: string;
  message: ITelegramMessageBody;
}

export interface ITelegramMessage {
  id: string;
  userId: string;
  channelId: string;
  date: number;
  text: string;
}

export interface IChannelDetails {
  id: string;
  createdDate: number;
  title: string;
  userName: string;
  photo: string;
}

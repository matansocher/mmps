export type TelegramChannelPost = {
  readonly id: number; // sequential per channel — safe for lastSeen diffing
  readonly url: string;
  readonly text: string | null;
  readonly publishedAt: string | null; // ISO date string
  readonly views: string | null; // human-formatted (e.g. "1.2M")
  readonly hasPhoto: boolean;
  readonly hasVideo: boolean;
};

export type TelegramChannelInfo = {
  readonly handle: string;
  readonly title: string | null;
  readonly subscribers: string | null; // human-formatted (e.g. "25.2K")
};

export type TelegramChannelResult = {
  readonly channel: TelegramChannelInfo;
  readonly posts: TelegramChannelPost[];
};

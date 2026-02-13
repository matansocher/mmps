export type TelegramBotConfig = {
  readonly id: string;
  readonly name: string;
  readonly token: string;
  readonly forceLocal?: boolean;
  readonly commands?: {
    [key: string]: {
      command: string;
      description: string;
      hide?: boolean;
    };
  };
  readonly keyboardOptions?: string[];
};

export type UserDetails = {
  readonly chatId: number;
  readonly telegramUserId: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly username: string;
};

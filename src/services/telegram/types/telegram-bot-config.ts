export type TelegramBotConfig = {
  readonly id: string;
  readonly name: string;
  readonly token: string;
  readonly commands?: {
    [key: string]: {
      command: string;
      description: string;
      hide?: boolean;
    };
  };
};

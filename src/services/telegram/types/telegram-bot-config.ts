export type TelegramBotConfig = {
  readonly id: string;
  readonly name: string;
  readonly token: string;
  readonly overrideLocally?: boolean;
  readonly commands?: {
    [key: string]: {
      command: string;
      description: string;
      hide?: boolean;
    };
  };
  readonly keyboardOptions?: string[];
};

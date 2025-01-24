export interface TelegramClientFactoryOptions {
  name: string;
  apiId: number;
  apiHash: string;
  stringSession: string;
  connectionRetries?: number;
}

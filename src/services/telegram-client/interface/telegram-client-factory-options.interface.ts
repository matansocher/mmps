export interface ITelegramClientFactoryOptions {
  name: string;
  apiId: number;
  apiHash: string;
  stringSession: string;
  connectionRetries?: number;
}

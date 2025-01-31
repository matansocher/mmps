export interface TelegramClientFactoryOptions {
  readonly name: string;
  readonly apiId: number;
  readonly apiHash: string;
  readonly stringSession: string;
  readonly connectionRetries?: number;
}

import type { BOT_BROADCAST_ACTIONS } from '../constants';

export interface MessageLoaderOptions {
  readonly loaderEmoji?: string;
  readonly maxEmojis?: number;
  readonly cycleDuration?: number;
  readonly loadingAction?: BOT_BROADCAST_ACTIONS;
}

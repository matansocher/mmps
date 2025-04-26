import type { BOT_BROADCAST_ACTIONS } from '../constants';

export interface MessageLoaderOptions {
  readonly loaderMessage?: string;
  readonly reactionEmoji?: string;
  readonly loadingAction?: BOT_BROADCAST_ACTIONS;
  readonly noMessage?: boolean;
}

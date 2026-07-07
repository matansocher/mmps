export type ClutchEventName = 'app_opened' | 'game_started' | 'game_ended' | 'daily_completed' | 'grid_completed' | 'shared';

export const CLUTCH_EVENTS: ReadonlySet<string> = new Set<ClutchEventName>([
  'app_opened',
  'game_started',
  'game_ended',
  'daily_completed',
  'grid_completed',
  'shared',
]);

export type ClutchEvent = {
  readonly event: ClutchEventName;
  readonly uid?: string;
  readonly ts?: number;
  readonly data?: Readonly<Record<string, unknown>>;
};

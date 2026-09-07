/**
 * Single source of truth for the deterministic run id derived for legacy play
 * entries (pre-upgrade rows that predate client-generated run ids). The same
 * rule is applied to incoming sync data and to stored history so old and new
 * entries dedupe against each other instead of being dropped.
 */
export function legacyRunId(gameId: string, at: string): string {
  return `legacy:${gameId}@${at}`;
}

import { MY_USER_ID } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { getLiveRumours, TOP5_LEAGUE_IDS } from '@services/transfer-tracker';
import type { TransferRumour } from '@services/transfer-tracker';
import { createPendingRumours, getLastSeenAt, setLastSeenAt } from '@shared/transfer-tracker';
import type { CreatePendingRumourData } from '@shared/transfer-tracker';

const logger = new Logger('chatbot:scheduler:transfer-collect');

// Player-quality gate: notable enough to report regardless of how likely the move is.
const MIN_PROMINENCE = 50; // 0-92 caliber + media attention score
const MIN_MARKET_VALUE_EUR = 20_000_000;

// A move qualifies when either the selling or buying club is in a top-5 league
// (catches arrivals, internal moves and top-5 players leaving) and the player is notable.
function isQualifying(rumour: TransferRumour): boolean {
  const inTop5 = [rumour.fromClub?.leagueId, rumour.toClub?.leagueId].some((leagueId) => leagueId != null && TOP5_LEAGUE_IDS.includes(leagueId));
  if (!inTop5) {
    return false;
  }
  return rumour.prominence >= MIN_PROMINENCE || (rumour.marketValueEur ?? 0) >= MIN_MARKET_VALUE_EUR;
}

function toPendingRumour(rumour: TransferRumour): CreatePendingRumourData {
  return {
    chatId: MY_USER_ID,
    rumourId: rumour.id,
    reportedAt: new Date(rumour.reportedAt),
    summary: rumour.summary,
    status: rumour.status,
    probability: rumour.probability,
    playerName: rumour.playerName,
    playerPosition: rumour.playerPosition,
    marketValueEur: rumour.marketValueEur,
    feeLabel: rumour.feeLabel,
    fromClub: rumour.fromClub?.name ?? null,
    toClub: rumour.toClub?.name ?? null,
    sourceName: rumour.primarySource?.name ?? null,
    sourceUrl: rumour.sourceUrl,
  };
}

// Silently collects newly-reported top-5 rumours for notable players into the
// PendingRumour collection; the evening digest scheduler sends them at 21:00.
export async function transferCollect(): Promise<void> {
  try {
    const lastSeenAt = await getLastSeenAt();
    const rumours = await getLiveRumours({ sinceIso: lastSeenAt?.toISOString() });
    if (!rumours.length) {
      return;
    }

    const qualifying = rumours.filter(isQualifying);
    // Persist pending rumours before advancing the cursor — a crash in between re-collects
    // instead of losing rumours (createPendingRumours dedupes by rumourId + reportedAt).
    await createPendingRumours(qualifying.map(toPendingRumour));

    const newestAt = rumours.reduce((max, rumour) => (new Date(rumour.reportedAt) > max ? new Date(rumour.reportedAt) : max), new Date(rumours[0].reportedAt));
    await setLastSeenAt(newestAt);

    if (qualifying.length > 0) {
      logger.log(`Collected ${qualifying.length} qualifying transfer rumours (of ${rumours.length} new)`);
    }
  } catch (err) {
    logger.error(`Failed to collect transfer rumours: ${getErrorMessage(err)}`);
  }
}

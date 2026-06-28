import axios from 'axios';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Logger } from '@core/utils';
import { APP_TYPE_ID, COUNTRY_ID, LANGUAGE_ID, SCORES_365_API_URL } from '@services/scores-365';
import { STAGE_ROUND, WC_COMPETITION_ID } from './constants';
import type { RawBracket, WcPlacement } from './types';

const logger = new Logger('WcTreeAdapter');

// Turn a raw 365scores `brackets` payload into inner-round placements.
// Only teams with a resolved competitorId (i.e. actually qualified) are placed;
// unresolved "winner of match X" placeholders are skipped.
export function bracketToPlacements(brackets: RawBracket[] | undefined): WcPlacement[] {
  const bracket = (brackets ?? []).find((b) => (b.stages ?? []).some((s) => s.num === 2));
  if (!bracket) {
    return [];
  }
  const stages = bracket.stages ?? [];

  // Map competitorId -> { group, pos } from the Round-of-32 stage.
  const origin = new Map<number, { group: number; pos: number }>();
  const r32 = stages.find((s) => s.num === 2);
  for (const g of r32?.groups ?? []) {
    (g.participants ?? []).forEach((p, i) => {
      if (typeof p.competitorId === 'number') {
        origin.set(p.competitorId, { group: g.num, pos: i });
      }
    });
  }

  const placements: WcPlacement[] = [];
  for (const stage of stages) {
    const round = STAGE_ROUND[stage.num];
    if (!round) {
      continue;
    }
    for (const g of stage.groups ?? []) {
      if (round === 'FINAL' && g.num !== 1) {
        continue; // skip the 3rd-place group
      }
      (g.participants ?? []).forEach((p, slot) => {
        const o = typeof p.competitorId === 'number' ? origin.get(p.competitorId) : undefined;
        if (!o) {
          return; // unresolved placeholder — team not qualified yet
        }
        placements.push({ round, gnum: g.num, slot, name: p.name, group: o.group, pos: o.pos });
      });
    }
  }
  return placements;
}

export async function fetchWcPlacements(): Promise<WcPlacement[]> {
  try {
    const params = { appTypeId: APP_TYPE_ID, langId: LANGUAGE_ID, timezoneName: DEFAULT_TIMEZONE, userCountryId: COUNTRY_ID, competitions: WC_COMPETITION_ID };
    const { data } = await axios.get<{ brackets: RawBracket[] }>(`${SCORES_365_API_URL}/brackets/`, { params });
    return bracketToPlacements(data.brackets);
  } catch (err) {
    logger.error(`Failed to fetch World Cup bracket: ${err}`);
    return [];
  }
}

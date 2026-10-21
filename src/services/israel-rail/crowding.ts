import type { CrowdingLevel, TrainTravel } from './types';

export const CROWDING_MODERATE_PERCENT = 40;
export const CROWDING_BUSY_PERCENT = 70;

export const CROWDING_EMOJI: Record<CrowdingLevel, string> = { quiet: '🟢', moderate: '🟡', busy: '🔴' };

export function getCrowdingLevel(loadPercent?: number): CrowdingLevel | undefined {
  if (loadPercent === undefined || loadPercent === null || Number.isNaN(loadPercent)) return undefined;
  if (loadPercent >= CROWDING_BUSY_PERCENT) return 'busy';
  if (loadPercent >= CROWDING_MODERATE_PERCENT) return 'moderate';
  return 'quiet';
}

// A trip is as crowded as its busiest leg.
export function getTravelLoadPercent(travel: TrainTravel): number | undefined {
  const loads = travel.legs.map((leg) => leg.predictedLoadPercent).filter((load): load is number => typeof load === 'number');
  return loads.length ? Math.max(...loads) : undefined;
}

export function getTravelCrowding(travel: TrainTravel): CrowdingLevel | undefined {
  return getCrowdingLevel(getTravelLoadPercent(travel));
}

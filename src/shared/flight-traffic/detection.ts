import { LOW_RATIO, MIN_BASELINE, MIN_SAMPLES, RECOVER_RATIO } from './constants';
import type { FlightTrafficSample, TrafficEvaluation } from './types';

export type EvaluateTrafficInput = {
  readonly inside: number;
  readonly outside: number;
  readonly history: ReadonlyArray<Pick<FlightTrafficSample, 'insideCount' | 'outsideCount'>>;
  readonly isLowTraffic: boolean;
};

export function median(values: ReadonlyArray<number>): number {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function evaluateTraffic({ inside, outside, history, isLowTraffic }: EvaluateTrafficInput): TrafficEvaluation {
  if (history.length < MIN_SAMPLES) {
    return { status: 'warming_up', transition: 'none', baselineInside: null, baselineOutside: null, ratio: null, neighbourRatio: null };
  }

  const baselineInside = median(history.map(({ insideCount }) => insideCount));
  const baselineOutside = median(history.map(({ outsideCount }) => outsideCount));
  const ratio = baselineInside > 0 ? inside / baselineInside : null;
  const neighbourRatio = baselineOutside > 0 ? outside / baselineOutside : null;
  const base = { baselineInside, baselineOutside, ratio, neighbourRatio };

  // Too few flights are typical for this hour to tell a closure from a quiet night, so keep the current state.
  if (baselineInside < MIN_BASELINE) {
    return { ...base, status: 'quiet_hour', transition: 'none' };
  }

  if (isLowTraffic) {
    return ratio >= RECOVER_RATIO ? { ...base, status: 'normal', transition: 'recover' } : { ...base, status: 'low', transition: 'none' };
  }

  return ratio <= LOW_RATIO ? { ...base, status: 'low', transition: 'enter_low' } : { ...base, status: 'normal', transition: 'none' };
}

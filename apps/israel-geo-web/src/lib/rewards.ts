import type { CoinReward, RoundResult } from '../types';

export const GAME_COMPLETION_COINS = 25;

export function calculateRoundCoinReward(result: RoundResult, isNewStamp: boolean): CoinReward {
  const circleHit = result.circleHit ? 5 : 0;
  let precision = 0;
  if (result.circleHit) {
    if (result.circleRadiusKm <= 5) precision = 15;
    else if (result.circleRadiusKm <= 15) precision = 10;
    else if (result.circleRadiusKm <= 30) precision = 5;
  }
  const newStamp = isNewStamp ? 10 : 0;
  return { completion: 0, circleHit, precision, newStamp, total: circleHit + precision + newStamp };
}

export function addCoinRewards(current: CoinReward, next: CoinReward): CoinReward {
  return {
    completion: current.completion + next.completion,
    circleHit: current.circleHit + next.circleHit,
    precision: current.precision + next.precision,
    newStamp: current.newStamp + next.newStamp,
    total: current.total + next.total,
  };
}

export function emptyCoinReward(): CoinReward {
  return { completion: 0, circleHit: 0, precision: 0, newStamp: 0, total: 0 };
}

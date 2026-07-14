import type { PlayerProfile } from '../types';
import { getWeekKey } from './cosmetics';

export function isWeeklyPreviewAvailable(profile: PlayerProfile): boolean {
  return profile.previewUsedWeekKey !== getWeekKey() && !profile.previewCosmeticId;
}

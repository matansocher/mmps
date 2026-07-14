import type { CosmeticCategory } from './types';

export type ServerCosmetic = {
  readonly id: string;
  readonly category: CosmeticCategory;
  readonly price?: 100 | 180 | 300;
  readonly passportMilestone?: 3 | 6 | 12 | 18;
};

export const SERVER_COSMETICS: readonly ServerCosmetic[] = [
  { id: 'cover-coast', category: 'passport-cover', price: 100 },
  { id: 'cover-desert', category: 'passport-cover', price: 180 },
  { id: 'cover-city', category: 'passport-cover', price: 300 },
  { id: 'map-coast', category: 'map-theme', price: 100 },
  { id: 'map-desert', category: 'map-theme', price: 180 },
  { id: 'map-night', category: 'map-theme', price: 300 },
  { id: 'pin-sea', category: 'pin', price: 100 },
  { id: 'pin-sun', category: 'pin', price: 180 },
  { id: 'pin-city', category: 'pin', price: 300 },
  { id: 'frame-coast', category: 'share-frame', price: 100 },
  { id: 'frame-desert', category: 'share-frame', price: 180 },
  { id: 'frame-city', category: 'share-frame', price: 300 },
  { id: 'frame-first-route', category: 'share-frame', passportMilestone: 3 },
  { id: 'cover-cross-country', category: 'passport-cover', passportMilestone: 6 },
  { id: 'map-northern-roads', category: 'map-theme', passportMilestone: 12 },
  { id: 'pin-local-legend', category: 'pin', passportMilestone: 18 },
] as const;

export function getServerCosmetic(id: string): ServerCosmetic | undefined {
  return SERVER_COSMETICS.find((cosmetic) => cosmetic.id === id);
}

import type { CosmeticCategory, EquippedCosmetics } from '../types';

export type Cosmetic = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: CosmeticCategory;
  readonly palette: readonly [string, string];
  readonly price?: 100 | 180 | 300;
  readonly passportMilestone?: 3 | 6 | 12 | 18;
};

export const COSMETICS: readonly Cosmetic[] = [
  { id: 'cover-coast', name: 'Mediterranean Lines', description: 'Cool coastal blues with clean route lines.', category: 'passport-cover', palette: ['#0EA5E9', '#1E3A8A'], price: 100 },
  { id: 'cover-desert', name: 'Negev Dawn', description: 'Warm sandstone and sunrise orange.', category: 'passport-cover', palette: ['#FB923C', '#7C2D12'], price: 180 },
  { id: 'cover-city', name: 'Midnight Tel Aviv', description: 'Electric city light over deep navy.', category: 'passport-cover', palette: ['#8B5CF6', '#111827'], price: 300 },
  { id: 'map-coast', name: 'Coastline Atlas', description: 'Bright water and calm coastal roads.', category: 'map-theme', palette: ['#38BDF8', '#E0F2FE'], price: 100 },
  { id: 'map-desert', name: 'Desert Routes', description: 'Sand, stone, and orange highways.', category: 'map-theme', palette: ['#F59E0B', '#FEF3C7'], price: 180 },
  { id: 'map-night', name: 'Night Navigator', description: 'A dark road map made for city lights.', category: 'map-theme', palette: ['#6366F1', '#111827'], price: 300 },
  { id: 'pin-sea', name: 'Sea Marker', description: 'A crisp blue marker inspired by the coast.', category: 'pin', palette: ['#0EA5E9', '#082F49'], price: 100 },
  { id: 'pin-sun', name: 'Sunstone Pin', description: 'A warm amber marker for desert explorers.', category: 'pin', palette: ['#F59E0B', '#78350F'], price: 180 },
  { id: 'pin-city', name: 'City Beacon', description: 'A vivid violet marker for night drives.', category: 'pin', palette: ['#A855F7', '#3B0764'], price: 300 },
  { id: 'frame-coast', name: 'Coastal Postcard', description: 'A clean blue frame for shared results.', category: 'share-frame', palette: ['#0EA5E9', '#172554'], price: 100 },
  { id: 'frame-desert', name: 'Desert Horizon', description: 'A cinematic orange desert border.', category: 'share-frame', palette: ['#F97316', '#431407'], price: 180 },
  { id: 'frame-city', name: 'City Lights', description: 'A neon frame for memorable scores.', category: 'share-frame', palette: ['#A855F7', '#111827'], price: 300 },
  { id: 'frame-first-route', name: 'First Route', description: 'Exclusive reward for collecting 3 Passport stamps.', category: 'share-frame', palette: ['#22C55E', '#052E16'], passportMilestone: 3 },
  {
    id: 'cover-cross-country',
    name: 'Cross Country',
    description: 'Exclusive reward for collecting 6 Passport stamps.',
    category: 'passport-cover',
    palette: ['#14B8A6', '#134E4A'],
    passportMilestone: 6,
  },
  {
    id: 'map-northern-roads',
    name: 'Northern Roads',
    description: 'Exclusive reward for collecting 12 Passport stamps.',
    category: 'map-theme',
    palette: ['#22C55E', '#052E16'],
    passportMilestone: 12,
  },
  { id: 'pin-local-legend', name: 'Local Legend', description: 'Exclusive reward for completing all 18 Passport stamps.', category: 'pin', palette: ['#FACC15', '#713F12'], passportMilestone: 18 },
] as const;

export const SHOP_COSMETICS = COSMETICS.filter((cosmetic) => cosmetic.price !== undefined);
export const PASSPORT_REWARD_COSMETICS = COSMETICS.filter((cosmetic) => cosmetic.passportMilestone !== undefined);

export const CATEGORY_LABELS: Readonly<Record<CosmeticCategory, string>> = {
  'passport-cover': 'Passport covers',
  'map-theme': 'Map themes',
  pin: 'Guess pins',
  'share-frame': 'Share-card frames',
};

export function getCosmetic(id: string | undefined): Cosmetic | undefined {
  if (!id) return undefined;
  const found = COSMETICS.find((cosmetic) => cosmetic.id === id);
  if (found) return found;
  if (id.startsWith('frame-light-up-')) {
    return { id, name: 'Light Up Israel', description: 'Monthly Light Up Israel reward frame.', category: 'share-frame', palette: ['#F59E0B', '#7C3AED'] };
  }
  return undefined;
}

export function getWeekKey(date = new Date()): string {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

export function getWeeklyFeaturedCosmetic(date = new Date()): Cosmetic {
  const previewable = SHOP_COSMETICS.filter((cosmetic) => cosmetic.category !== 'passport-cover');
  const weekKey = getWeekKey(date);
  const hash = [...weekKey].reduce((total, character) => total + character.charCodeAt(0), 0);
  return previewable[hash % previewable.length];
}

export function getCosmeticPrice(cosmetic: Cosmetic, date = new Date()): number {
  if (!cosmetic.price) return 0;
  return getWeeklyFeaturedCosmetic(date).id === cosmetic.id ? Math.round(cosmetic.price * 0.8) : cosmetic.price;
}

export function resolveEquippedCosmetics(equipped: EquippedCosmetics, previewCosmeticId?: string): EquippedCosmetics {
  const preview = getCosmetic(previewCosmeticId);
  return preview ? { ...equipped, [preview.category]: preview.id } : equipped;
}

export function getPassportMilestoneUnlocks(stampCount: number): readonly Cosmetic[] {
  return PASSPORT_REWARD_COSMETICS.filter((cosmetic) => cosmetic.passportMilestone! <= stampCount);
}

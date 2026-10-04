import type { WoltRestaurant } from '@shared/wolt';

// e.g. "⭐ 8.0 · 🕒 15-25 דק׳ · ₪₪" - parts with missing data are left out, empty string when nothing is known
export function formatRestaurantDetails({ rating, estimateRange, estimateMinutes, priceRange }: WoltRestaurant): string {
  const estimate = estimateRange || (estimateMinutes ? `${estimateMinutes}` : undefined);
  const parts = [typeof rating === 'number' ? `⭐ ${rating.toFixed(1)}` : undefined, estimate ? `🕒 ${estimate} דק׳` : undefined, priceRange ? '₪'.repeat(priceRange) : undefined];
  return parts.filter(Boolean).join(' · ');
}

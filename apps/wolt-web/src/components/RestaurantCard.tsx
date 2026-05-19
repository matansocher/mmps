import type { RestaurantItem } from '../types';

type Props = {
  readonly restaurant: RestaurantItem;
  readonly isSubscribed: boolean;
  readonly onTap: (r: RestaurantItem) => void;
};

export function RestaurantCard({ restaurant, isSubscribed, onTap }: Props) {
  const { name, photo, isOnline, area, rating, priceRange, estimateMinutes } = restaurant;
  const hasMeta = rating != null || priceRange != null || estimateMinutes != null;

  return (
    <button
      onClick={() => onTap(restaurant)}
      className="text-right bg-bg-card border border-border-subtle rounded-xl overflow-hidden active:scale-[0.98] transition-transform"
    >
      <div className="relative aspect-[4/3] bg-bg-elevated">
        {photo && <img src={photo} alt={name} className="w-full h-full object-cover" loading="lazy" />}
        <div className="absolute top-2 right-2">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isOnline ? 'bg-accent-online text-black animate-online-pulse' : 'bg-black/70 text-text-secondary'
            }`}
          >
            {isOnline ? 'פתוח' : 'סגור'}
          </span>
        </div>
        {isSubscribed && (
          <div className="absolute top-2 left-2 bg-accent-brand text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
            במעקב
          </div>
        )}
      </div>
      <div className="p-2.5">
        <div className="text-sm text-text-primary truncate" dir="ltr">{name}</div>
        <div className="text-[11px] text-text-muted truncate mt-0.5" dir="ltr">{area}</div>
        {hasMeta && (
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-text-secondary" dir="ltr">
            {rating != null && <span>★ {rating.toFixed(1)}</span>}
            {priceRange != null && <span>{'₪'.repeat(priceRange)}</span>}
            {estimateMinutes != null && <span>{estimateMinutes}m</span>}
          </div>
        )}
      </div>
    </button>
  );
}

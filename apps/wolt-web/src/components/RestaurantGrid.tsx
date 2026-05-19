import type { RestaurantItem } from '../types';
import { RestaurantCard } from './RestaurantCard';

type Props = {
  readonly title: string;
  readonly restaurants: ReadonlyArray<RestaurantItem>;
  readonly subscribedNames: ReadonlySet<string>;
  readonly onTap: (r: RestaurantItem) => void;
  readonly emptyMessage?: string;
  readonly total?: number;
};

export function RestaurantGrid({ title, restaurants, subscribedNames, onTap, emptyMessage, total }: Props) {
  const countLabel = total != null && total !== restaurants.length ? `${restaurants.length} / ${total}` : `${restaurants.length}`;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 px-1">
        <h2 className="text-sm text-text-secondary font-semibold">{title}</h2>
        <span className="text-xs text-text-muted" dir="ltr">{countLabel}</span>
      </div>
      {restaurants.length === 0 ? (
        <div className="text-center text-text-muted text-sm py-10">{emptyMessage ?? 'אין מה להציג'}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {restaurants.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} isSubscribed={subscribedNames.has(r.name)} onTap={onTap} />
          ))}
        </div>
      )}
    </div>
  );
}

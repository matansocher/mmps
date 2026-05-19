import type { SubscriptionItem } from '../types';

type Props = {
  readonly subscriptions: ReadonlyArray<SubscriptionItem>;
  readonly onRemove: (restaurant: string) => void;
};

export function AlertsStrip({ subscriptions, onRemove }: Props) {
  if (subscriptions.length === 0) return null;

  return (
    <div>
      <div className="mb-2 px-1">
        <h2 className="text-sm text-text-secondary font-semibold">
          ההתראות שלי <span className="text-text-muted font-normal">({subscriptions.length})</span>
        </h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
        {subscriptions.map((s) => (
          <div key={s.restaurant} className="snap-start shrink-0 w-36 bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
            <div className="relative h-20 bg-bg-elevated">
              {s.photo && <img src={s.photo} alt={s.restaurant} className="w-full h-full object-cover" />}
              <button
                onClick={() => onRemove(s.restaurant)}
                className="absolute top-1 left-1 bg-black/70 hover:bg-accent-danger text-white text-xs w-6 h-6 rounded-full flex items-center justify-center"
                aria-label="remove"
              >
                ×
              </button>
            </div>
            <div className="p-2">
              <div className="text-xs text-text-primary truncate" dir="ltr">{s.restaurant}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

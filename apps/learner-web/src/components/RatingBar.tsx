import type { Rating } from '../lib/types';
import { AppIcon, type AppIconName } from './AppIcon';

type RatingBarProps = {
  readonly current: Rating | null;
  readonly onRate: (rating: Rating) => void;
};

const OPTIONS: ReadonlyArray<{ rating: Rating; icon: AppIconName; label: string }> = [
  { rating: 'nope', icon: 'nope', label: 'Nope' },
  { rating: 'fuzzy', icon: 'fuzzy', label: 'Fuzzy' },
  { rating: 'got_it', icon: 'check', label: 'Got it' },
];

export function RatingBar({ current, onRate }: RatingBarProps) {
  return (
    <div className="rating-bar">
      <div className="rate-title">How well did you recall this?</div>
      {OPTIONS.map(({ rating, icon, label }) => (
        <button
          key={rating}
          type="button"
          className={`rate-btn ${rating} ${current === rating ? 'selected' : ''}`}
          onClick={() => onRate(rating)}
        >
          <span className="rate-icon" aria-hidden>
            <AppIcon name={icon} />
          </span>
          {label}
        </button>
      ))}
    </div>
  );
}

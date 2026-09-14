import type { Rating } from '../lib/types';

type RatingBarProps = {
  readonly current: Rating | null;
  readonly onRate: (rating: Rating) => void;
};

const OPTIONS: ReadonlyArray<{ rating: Rating; emoji: string; label: string }> = [
  { rating: 'nope', emoji: '😵', label: 'Nope' },
  { rating: 'fuzzy', emoji: '🤔', label: 'Fuzzy' },
  { rating: 'got_it', emoji: '💪', label: 'Got it' },
];

export function RatingBar({ current, onRate }: RatingBarProps) {
  return (
    <div className="rating-bar">
      <div className="rate-title">How well did you recall this?</div>
      {OPTIONS.map(({ rating, emoji, label }) => (
        <button
          key={rating}
          type="button"
          className={`rate-btn ${rating} ${current === rating ? 'selected' : ''}`}
          onClick={() => onRate(rating)}
        >
          <span className="emoji" aria-hidden>
            {emoji}
          </span>
          {label}
        </button>
      ))}
    </div>
  );
}

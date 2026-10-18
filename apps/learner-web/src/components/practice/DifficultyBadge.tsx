import type { PracticeDifficulty } from '../../lib/practice';

const LEVELS: readonly PracticeDifficulty[] = ['easy', 'medium', 'hard'];
const LABELS: Record<PracticeDifficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export function DifficultyBadge({ difficulty }: { readonly difficulty: PracticeDifficulty }) {
  const level = LEVELS.indexOf(difficulty) + 1;
  return (
    <span className={`difficulty-badge ${difficulty}`} title={`Difficulty: ${LABELS[difficulty]} (level ${level} of ${LEVELS.length} in this lesson)`}>
      <span className="difficulty-bars" aria-hidden="true">
        {LEVELS.map((l, i) => (
          <span key={l} className={i < level ? 'on' : ''} />
        ))}
      </span>
      {LABELS[difficulty]}
    </span>
  );
}

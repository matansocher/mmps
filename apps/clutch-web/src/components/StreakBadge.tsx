type Props = {
  readonly count: number;
  readonly label?: string;
  readonly size?: 'sm' | 'md';
};

export function StreakBadge({ count, label, size = 'md' }: Props) {
  const dim = count <= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-court-card font-bold ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      } ${dim ? 'text-ink-muted' : 'text-flame'}`}
    >
      <span>{dim ? '🔥' : '🔥'}</span>
      <span>{count}</span>
      {label && <span className="font-medium text-ink-secondary">{label}</span>}
    </span>
  );
}

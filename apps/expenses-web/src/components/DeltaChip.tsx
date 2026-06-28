type Props = {
  // Percent vs a historic baseline. Positive = spending more than usual (bad), negative = less (good).
  readonly percent: number;
  readonly size?: 'xs' | 'sm';
  // Some metrics (e.g. "savings") are inverted; pass invert=true to flip the color logic.
  readonly invert?: boolean;
};

export function DeltaChip({ percent, size = 'sm', invert = false }: Props) {
  const rounded = Math.round(percent);
  const isUp = rounded > 0;
  const isFlat = rounded === 0;
  // Spending more than baseline reads as warning; less reads as good. `invert` swaps that.
  const good = invert ? isUp : !isUp;
  const color = isFlat
    ? 'bg-bg-elevated text-text-muted'
    : good
      ? 'bg-emerald-500/15 text-emerald-400'
      : 'bg-rose-500/15 text-rose-400';
  const sizeClass = size === 'xs' ? 'text-[10px] px-1 py-[1px]' : 'text-[11px] px-1.5 py-[2px]';
  const arrow = isFlat ? '·' : isUp ? '↑' : '↓';
  const value = isFlat ? '0%' : `${Math.abs(rounded)}%`;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-md font-medium tabular ${sizeClass} ${color}`}>
      <span>{arrow}</span>
      <span>{value}</span>
    </span>
  );
}

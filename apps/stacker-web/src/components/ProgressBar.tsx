type Props = { answered: number; total: number };

export function ProgressBar({ answered, total }: Props) {
  const pct = total === 0 ? 0 : Math.min(100, Math.round((answered / total) * 100));
  return (
    <div className="w-full">
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-gray-400 mt-1 text-center">
        {answered} / {total}
      </div>
    </div>
  );
}

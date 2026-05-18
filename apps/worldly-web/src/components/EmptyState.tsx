type Props = {
  readonly title: string;
  readonly hint?: string;
};

export function EmptyState({ title, hint }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-text-secondary text-base">{title}</div>
      {hint && <div className="text-text-muted text-sm mt-2">{hint}</div>}
    </div>
  );
}

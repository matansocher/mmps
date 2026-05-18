export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="text-center py-10 text-text-secondary">
      <div className="text-lg">{title}</div>
      {hint && <div className="text-sm text-text-muted mt-1">{hint}</div>}
    </div>
  );
}

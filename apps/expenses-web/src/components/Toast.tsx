import { useEffect } from 'react';

type Props = {
  readonly message: string;
  readonly kind: 'success' | 'error' | 'info';
  readonly onDismiss: () => void;
};

export function Toast({ message, kind, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 2400);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const color =
    kind === 'success' ? 'bg-accent-success/15 border-accent-success/40 text-accent-success'
    : kind === 'error' ? 'bg-accent-danger/15 border-accent-danger/40 text-accent-danger'
    : 'bg-bg-elevated border-border-subtle text-text-primary';

  return (
    <div className="fixed left-1/2 bottom-20 -translate-x-1/2 z-50 animate-fade-in">
      <div className={`px-4 py-2 rounded-full border text-sm ${color}`}>{message}</div>
    </div>
  );
}

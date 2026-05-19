import { useEffect } from 'react';

type Props = {
  readonly message: string;
  readonly kind?: 'success' | 'error' | 'info';
  readonly onDismiss: () => void;
};

export function Toast({ message, kind = 'info', onDismiss }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2500);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  const color = kind === 'success' ? 'bg-accent-online text-black' : kind === 'error' ? 'bg-accent-danger text-white' : 'bg-bg-elevated text-text-primary';

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 pointer-events-none">
      <div className={`${color} px-4 py-2 rounded-xl shadow-lg text-sm font-medium`}>{message}</div>
    </div>
  );
}

import { useEffect } from 'react';

type Props = {
  readonly title: string;
  readonly body?: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly destructive?: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
};

export function ConfirmSheet({ title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive, onConfirm, onCancel }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onCancel} />
      <div className="relative w-full max-w-md bg-bg-card border-t border-border-subtle rounded-t-2xl p-5 pb-8 animate-fade-in">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        {body && <p className="mt-2 text-sm text-text-secondary">{body}</p>}
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={onConfirm}
            className={`w-full rounded-xl py-3 font-semibold text-sm ${
              destructive ? 'bg-accent-danger text-bg-base' : 'bg-accent-primary text-bg-base'
            }`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="w-full rounded-xl py-3 font-medium text-sm text-text-secondary bg-bg-elevated"
            autoFocus
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

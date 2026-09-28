import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export function Dialog({ title, children, onClose }: { readonly title: string; readonly children: ReactNode; readonly onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="ml-dialog"
      onKeyDown={(e) => e.stopPropagation()}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <h2>{title}</h2>
      {children}
    </dialog>
  );
}

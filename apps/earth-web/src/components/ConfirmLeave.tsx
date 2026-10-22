import { useEffect, useRef } from 'react';

export type LeaveGuard = {
  readonly detail: string; // Format: "You're on 4/10."
  readonly daily?: boolean;
};

type Props = {
  readonly guard: LeaveGuard;
  readonly onLeave: () => void;
  readonly onStay: () => void;
};

// Bottom sheet on phones, centred dialog on desktop. Keep playing is the default.
export function ConfirmLeave({ guard, onLeave, onStay }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="panel animate-rise m-0 mt-auto w-full max-w-none rounded-t-[22px] rounded-b-none border-b-0 p-0 text-[var(--color-fg)] backdrop:bg-black/55 sm:m-auto sm:w-[400px] sm:rounded-[18px] sm:border-b"
      aria-labelledby="leave-title"
      onCancel={(event) => {
        event.preventDefault();
        onStay();
      }}
      onClick={(event) => event.target === event.currentTarget && onStay()}
    >
      <div className="px-5 pt-5 pb-[calc(20px+var(--safe-bottom))] sm:pb-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 sm:hidden" aria-hidden="true" />
        <h2 id="leave-title" className="text-[20px] font-bold">
          Leave this round?
        </h2>
        <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--color-muted)]">
          {guard.detail} Your progress won’t be saved.
          {guard.daily && ' Today’s daily only counts once you finish it.'}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn w-full sm:w-auto" onClick={onLeave}>
            Leave
          </button>
          <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={onStay} autoFocus>
            Keep playing
          </button>
        </div>
      </div>
    </dialog>
  );
}

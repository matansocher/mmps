type Status = 'idle' | 'selected' | 'correct' | 'wrong' | 'reveal';

type Props = {
  readonly label: string;
  readonly status: Status;
  readonly disabled?: boolean;
  readonly onClick?: () => void;
};

const STATUS_CLASSES: Record<Status, string> = {
  idle: 'bg-bg-card border-border-subtle text-text-primary',
  selected: 'bg-bg-elevated border-border-subtle text-text-primary',
  correct: 'bg-accent-ok/20 border-accent-ok text-accent-ok',
  wrong: 'bg-accent-bad/20 border-accent-bad text-accent-bad',
  reveal: 'bg-accent-ok/10 border-accent-ok/70 text-accent-ok',
};

export function AnswerButton({ label, status, disabled, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl border px-4 py-3 text-base text-right transition-colors disabled:opacity-100 ${STATUS_CLASSES[status]}`}
    >
      {label}
    </button>
  );
}

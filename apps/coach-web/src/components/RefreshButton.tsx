type Props = {
  busy: boolean;
  onClick: () => void;
};

export function RefreshButton({ busy, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-label="רענן"
      className={`w-9 h-9 grid place-items-center rounded-full text-text-secondary transition-colors ${busy ? 'opacity-70' : 'hover:text-text-primary hover:bg-bg-elevated'}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`w-5 h-5 ${busy ? 'animate-spin' : ''}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    </button>
  );
}

import { useLocation } from 'wouter';

type Props = {
  readonly title: string;
  readonly right?: React.ReactNode;
};

export function TopBar({ title, right }: Props) {
  const [, navigate] = useLocation();
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line-subtle bg-court-base/90 px-4 py-3 backdrop-blur">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="no-select flex h-9 w-9 items-center justify-center rounded-full bg-court-card text-ink-secondary active:scale-95"
        aria-label="Home"
      >
        ‹
      </button>
      <h1 className="flex-1 truncate font-display text-2xl tracking-wide">{title}</h1>
      {right}
    </header>
  );
}

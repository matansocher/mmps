import { Link } from 'wouter';

type Props = {
  readonly href: string;
  readonly icon: string;
  readonly label: string;
};

export function ModeTile({ href, icon, label }: Props) {
  return (
    <Link href={href}>
      <a className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-bg-card border border-border-subtle p-4 active:scale-[0.98] transition-transform">
        <span className="text-3xl leading-none">{icon}</span>
        <span className="text-text-primary text-sm">{label}</span>
      </a>
    </Link>
  );
}

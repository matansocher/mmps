import { Link, useLocation } from 'wouter';

const items: { href: string; label: string; icon: string }[] = [
  { href: '/', label: 'בית', icon: '🏠' },
  { href: '/stats', label: 'סטטיסטיקה', icon: '📊' },
  { href: '/settings', label: 'הגדרות', icon: '⚙️' },
];

export function BottomNav() {
  const [location] = useLocation();
  return (
    <nav className="sticky bottom-0 bg-bg-base/85 backdrop-blur border-t border-border-subtle">
      <div className="flex items-center justify-around py-2">
        {items.map((it) => {
          const active = location === it.href;
          return (
            <Link key={it.href} href={it.href}>
              <a className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs ${active ? 'text-text-primary' : 'text-text-muted'}`}>
                <span className="text-lg leading-none">{it.icon}</span>
                <span>{it.label}</span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

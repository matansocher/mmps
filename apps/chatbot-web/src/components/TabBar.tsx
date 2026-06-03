import { Link, useLocation } from 'wouter';

type Tab = { readonly path: string; readonly label: string; readonly icon: string };

const TABS: ReadonlyArray<Tab> = [
  { path: '/', label: 'Dashboard', icon: '🏠' },
  { path: '/exercise', label: 'Exercise', icon: '💪' },
  { path: '/expenses', label: 'Expenses', icon: '💵' },
];

type Props = { readonly overdueCount?: number };

export function TabBar({ overdueCount = 0 }: Props) {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 inset-x-0 h-16 bg-bg-card border-t border-border-subtle flex z-30">
      {TABS.map((tab) => {
        const active = tab.path === '/' ? location === '/' : location.startsWith(tab.path);
        const showBadge = tab.path === '/' && overdueCount > 0;
        return (
          <Link
            key={tab.path}
            href={tab.path}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors ${
              active ? 'text-accent-primary' : 'text-text-muted'
            }`}
          >
            {active && <span className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-accent-primary rounded-b" />}
            <span className="text-lg leading-none relative">
              {tab.icon}
              {showBadge && (
                <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-1 rounded-full bg-accent-danger text-bg-base text-[9px] font-bold grid place-items-center">
                  {overdueCount > 9 ? '9+' : overdueCount}
                </span>
              )}
            </span>
            <span className="text-[10px] uppercase tracking-wide font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

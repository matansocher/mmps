import { useLocation } from 'wouter';

type Tab = { path: string; label: string; icon: string };

const TABS: Tab[] = [
  { path: '/', label: 'היום', icon: '⚽' },
  { path: '/competitions', label: 'ליגות', icon: '🏆' },
];

export function BottomNav() {
  const [location, navigate] = useLocation();
  return (
    <nav className="sticky bottom-0 z-10 bg-bg-base/90 backdrop-blur border-t border-border-subtle">
      <div className="grid grid-cols-2">
        {TABS.map((tab) => {
          const active = location === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
                active ? 'text-accent-win' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className="text-[11px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

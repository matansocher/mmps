import { useLocation } from 'wouter';

type Tab = { path: string; label: string; icon: string };

const TABS: Tab[] = [
  { path: '/', label: 'משחקים', icon: '⚽' },
  { path: '/tournament', label: 'טורניר', icon: '🏟️' },
  { path: '/leaderboard', label: 'דירוג', icon: '🏆' },
  { path: '/profile', label: 'פרופיל', icon: '👤' },
];

export function BottomNav() {
  const [location, navigate] = useLocation();
  return (
    <nav className="sticky bottom-0 z-10 bg-bg-base/90 backdrop-blur border-t border-border-subtle">
      <div className="grid grid-cols-4">
        {TABS.map((tab) => {
          const active = tab.path === '/' ? location === '/' : location.startsWith(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
                active ? 'text-accent-exact' : 'text-text-secondary hover:text-text-primary'
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

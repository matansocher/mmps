import { useT } from '../lib/i18n';
import { hapticSelect } from '../lib/telegram';
import { navigate, type Route, useRoute } from '../lib/router';
import { Icon, type IconName } from './Icon';

const TABS: readonly { readonly name: 'live' | 'leagues' | 'settings'; readonly icon: IconName }[] = [
  { name: 'live', icon: 'live' },
  { name: 'leagues', icon: 'trophy' },
  { name: 'settings', icon: 'settings' },
];

// Detail pages belong to the tab they were most likely opened from.
function activeTab(route: Route): string {
  if (route.name === 'league') return 'leagues';
  if (route.name === 'game' || route.name === 'team' || route.name === 'player') return 'live';
  return route.name;
}

function go(name: (typeof TABS)[number]['name']) {
  hapticSelect();
  navigate({ name });
}

export function DesktopNav() {
  const active = activeTab(useRoute());
  const t = useT();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {TABS.map((tab) => (
        <button
          key={tab.name}
          onClick={() => go(tab.name)}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${active === tab.name ? 'bg-bg-elevated text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
        >
          {t.nav[tab.name]}
        </button>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const active = activeTab(useRoute());
  const t = useT();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border-subtle bg-bg-base/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <div className="grid grid-cols-3">
        {TABS.map((tab) => (
          <button
            key={tab.name}
            onClick={() => go(tab.name)}
            className={`flex flex-col items-center gap-0.5 py-2 transition ${active === tab.name ? 'text-accent-live' : 'text-text-muted'}`}
          >
            <Icon name={tab.icon} size={20} />
            <span className="text-[11px] font-semibold">{t.nav[tab.name]}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

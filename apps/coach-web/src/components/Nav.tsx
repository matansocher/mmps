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

// One desktop bar for every page: fixed height and width, so the tabs never move between pages.
export function TopBar() {
  const active = activeTab(useRoute());
  const t = useT();
  return (
    <div className="sticky top-0 z-30 hidden h-14 border-b border-border-subtle bg-bg-base/95 backdrop-blur-md md:block">
      <div className="mx-auto flex h-full max-w-[1500px] items-center gap-8 px-4">
        <button onClick={() => go('live')} className="flex shrink-0 items-center gap-2 text-sm font-bold tracking-[-0.01em] text-text-primary">
          <span className="flex size-7 items-center justify-center rounded-lg bg-accent-live/12 text-accent-live">
            <Icon name="ball" size={16} />
          </span>
          {t.nav.brand}
        </button>
        <nav aria-label={t.nav.label} className="flex h-full items-stretch gap-1">
          {TABS.map((tab) => {
            const on = active === tab.name;
            return (
              <button
                key={tab.name}
                onClick={() => go(tab.name)}
                aria-current={on ? 'page' : undefined}
                className={`relative flex items-center gap-2 px-3 text-sm font-semibold transition duration-150 ease-out focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent-brand ${on ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <Icon name={tab.icon} size={16} className={on ? 'text-accent-live' : ''} />
                {t.nav[tab.name]}
                <span className={`absolute inset-x-3 -bottom-px h-0.5 rounded-full transition duration-150 ${on ? 'bg-accent-live' : 'bg-transparent'}`} />
              </button>
            );
          })}
        </nav>
      </div>
    </div>
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
            className={`flex flex-col items-center gap-0.5 py-2 transition ${active === tab.name ? 'text-accent-live' : 'text-text-secondary'}`}
          >
            <Icon name={tab.icon} size={20} />
            <span className="text-caption font-semibold">{t.nav[tab.name]}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

import { useEffect, useLayoutEffect, useRef } from 'react';
import { BottomNav, TopBar } from './components/Nav';
import { Notifications } from './components/Notifications';
import { DashboardProvider } from './hooks/useDashboard';
import { captureTokenFromUrl } from './lib/api';
import { LanguageProvider } from './lib/i18n';
import { goBack, type Route, routePath, TOP_LEVEL_ROUTES, useRoute } from './lib/router';
import { initTelegram, showBackButton } from './lib/telegram';
import { DashboardPage } from './pages/DashboardPage';
import { GamePage } from './pages/GamePage';
import { LeaguePage } from './pages/LeaguePage';
import { LeaguesPage } from './pages/LeaguesPage';
import { PlayerPage } from './pages/PlayerPage';
import { SettingsPage } from './pages/SettingsPage';
import { TeamPage } from './pages/TeamPage';

captureTokenFromUrl();
initTelegram();

function Page({ route }: { readonly route: Route }) {
  switch (route.name) {
    case 'game':
      return <GamePage key={route.id} id={route.id} />;
    case 'team':
      return <TeamPage key={route.id} id={route.id} />;
    case 'player':
      return <PlayerPage key={route.id} id={route.id} />;
    case 'league':
      return <LeaguePage key={route.id} id={route.id} />;
    case 'leagues':
      return <LeaguesPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <DashboardPage />;
  }
}

// Remembers the scroll position of each page so going back lands where you left off.
function useScrollRestore(path: string) {
  const positions = useRef(new Map<string, number>());
  const current = useRef(path);

  useEffect(() => {
    const onScroll = () => positions.current.set(current.current, window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useLayoutEffect(() => {
    current.current = path;
    const target = positions.current.get(path) ?? 0;
    window.scrollTo(0, target);
    // Detail pages render after their data loads, so retry once the content had a chance to grow.
    if (target > 0) {
      const timer = window.setTimeout(() => window.scrollTo(0, target), 300);
      return () => window.clearTimeout(timer);
    }
  }, [path]);
}

export function App() {
  const route = useRoute();
  const path = routePath(route);
  const isTopLevel = TOP_LEVEL_ROUTES.has(route.name);
  useScrollRestore(path);

  useEffect(() => (isTopLevel ? undefined : showBackButton(goBack)), [isTopLevel]);

  return (
    <LanguageProvider>
      <DashboardProvider>
        <TopBar />
        <Page route={route} />
        <Notifications />
        <BottomNav />
      </DashboardProvider>
    </LanguageProvider>
  );
}

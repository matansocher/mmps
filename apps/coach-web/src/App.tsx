import { useEffect, useState } from 'react';
import { captureTokenFromUrl } from './lib/api';
import { initTelegram } from './lib/telegram';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';

type Route = 'dashboard' | 'settings';

function readRoute(): Route {
  return window.location.hash === '#settings' ? 'settings' : 'dashboard';
}

captureTokenFromUrl();
initTelegram();

export function App() {
  const [route, setRoute] = useState<Route>(readRoute);

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (next: Route) => {
    window.location.hash = next === 'settings' ? 'settings' : '';
    setRoute(next);
  };

  return route === 'settings' ? <SettingsPage onBack={() => navigate('dashboard')} /> : <DashboardPage onOpenSettings={() => navigate('settings')} />;
}

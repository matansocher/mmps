import { useEffect } from 'react';
import { Route, Router, Switch } from 'wouter';
import { api } from './lib/api';
import { CompetitionsPage } from './pages/CompetitionsPage';
import { HomePage } from './pages/HomePage';
import { LeagueDetailPage } from './pages/LeagueDetailPage';
import { MatchDetailPage } from './pages/MatchDetailPage';
import { PlayerDetailPage } from './pages/PlayerDetailPage';
import { TeamDetailPage } from './pages/TeamDetailPage';

// Guard so the "open app" notification fires once per app load, not on every
// remount of HomePage (navigating into a match and back unmounts/remounts it).
let appOpened = false;

export function App() {
  useEffect(() => {
    if (appOpened) return;
    appOpened = true;
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
    api.open().catch(() => {});
  }, []);

  return (
    <Router base="/coach">
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/competitions" component={CompetitionsPage} />
        <Route path="/league/:id" component={LeagueDetailPage} />
        <Route path="/match/:id" component={MatchDetailPage} />
        <Route path="/team/:id" component={TeamDetailPage} />
        <Route path="/athlete/:id" component={PlayerDetailPage} />
        <Route>
          <div className="p-6">404</div>
        </Route>
      </Switch>
    </Router>
  );
}

import { useEffect } from 'react';
import { Route, Router, Switch } from 'wouter';
import { getWebApp } from './lib/telegram';
import { MatchesPage } from './pages/MatchesPage';
import { TeamDetailPage } from './pages/TeamDetailPage';
import { PlayerDetailPage } from './pages/PlayerDetailPage';
import { TournamentPage } from './pages/TournamentPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ProfilePage } from './pages/ProfilePage';

export function App() {
  useEffect(() => {
    const wa = getWebApp();
    if (wa) {
      wa.ready();
      wa.expand();
    }
  }, []);

  return (
    <Router base="/world-cup">
      <Switch>
        <Route path="/" component={MatchesPage} />
        <Route path="/teams/:teamId/player/:playerIndex" component={PlayerDetailPage} />
        <Route path="/teams/:id" component={TeamDetailPage} />
        <Route path="/tournament" component={TournamentPage} />
        <Route path="/leaderboard" component={LeaderboardPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route>
          <div className="p-6 text-text-muted">404 — Page not found</div>
        </Route>
      </Switch>
    </Router>
  );
}

import { Route, Router, Switch } from 'wouter';
import { CompetitionsPage } from './pages/CompetitionsPage';
import { HomePage } from './pages/HomePage';
import { LeagueDetailPage } from './pages/LeagueDetailPage';
import { MatchDetailPage } from './pages/MatchDetailPage';

export function App() {
  return (
    <Router base="/coach">
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/competitions" component={CompetitionsPage} />
        <Route path="/league/:id" component={LeagueDetailPage} />
        <Route path="/match/:id" component={MatchDetailPage} />
        <Route>
          <div className="p-6">404</div>
        </Route>
      </Switch>
    </Router>
  );
}

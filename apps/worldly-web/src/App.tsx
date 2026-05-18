import { Route, Router, Switch } from 'wouter';
import { GamePage } from './pages/GamePage';
import { HomePage } from './pages/HomePage';
import { SettingsPage } from './pages/SettingsPage';
import { StatsPage } from './pages/StatsPage';

export function App() {
  return (
    <Router base="/worldly">
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/play/:mode" component={GamePage} />
        <Route path="/stats" component={StatsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route>
          <div className="p-6">404</div>
        </Route>
      </Switch>
    </Router>
  );
}

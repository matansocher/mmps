import { Route, Router, Switch } from 'wouter';
import { Home } from './modes/Home';
import { DailyBracket } from './modes/DailyBracket';
import { DecadeChampions } from './modes/DecadeChampions';
import { RapidFire } from './modes/RapidFire';

export function App() {
  return (
    <Router base="/nba">
      <div className="min-h-full">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/daily" component={DailyBracket} />
          <Route path="/decades" component={DecadeChampions} />
          <Route path="/rapid" component={RapidFire} />
          <Route>
            <Home />
          </Route>
        </Switch>
      </div>
    </Router>
  );
}

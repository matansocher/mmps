import { Route, Router, Switch } from 'wouter';
import { Game } from './modes/Game';
import { Home } from './modes/Home';
import { LightUp } from './modes/LightUp';
import { Passport } from './modes/Passport';
import { Profile } from './modes/Profile';
import { PublicProfile } from './modes/PublicProfile';
import { Rewards } from './modes/Rewards';

function NormalGame() {
  return <Game />;
}

function DailyRoute() {
  return <Game mode="daily" />;
}

export function App() {
  return (
    <Router base="/israel-geo">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/play" component={NormalGame} />
        <Route path="/daily" component={DailyRoute} />
        <Route path="/passport" component={Passport} />
        <Route path="/rewards" component={Rewards} />
        <Route path="/profile/:token" component={PublicProfile} />
        <Route path="/profile" component={Profile} />
        <Route path="/light-up" component={LightUp} />
        <Route component={Home} />
      </Switch>
    </Router>
  );
}

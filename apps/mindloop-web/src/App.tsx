import { useEffect, useRef, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { hasOnboarded, Onboarding } from './components/Onboarding';
import { track } from './lib/analytics';
import { startPlayerSync } from './lib/player-sync';
import { initializeTelegram } from './lib/telegram';
import { GameShell } from './pages/GameShell';
import { Home } from './pages/Home';
import { Settings } from './pages/Settings';
import { Stats } from './pages/Stats';

export default function App() {
  const tracked = useRef(false);
  const location = useLocation();
  const isGame = location.pathname.startsWith('/game/');
  const [onboarding, setOnboarding] = useState(() => !hasOnboarded());

  // Allow Settings → "Replay intro" to relaunch the onboarding.
  useEffect(() => {
    const replay = () => setOnboarding(true);
    window.addEventListener('mindloop:replay-onboarding', replay);
    return () => window.removeEventListener('mindloop:replay-onboarding', replay);
  }, []);

  useEffect(() => {
    const cleanupTelegram = initializeTelegram();
    const cleanupSync = startPlayerSync();
    if (!tracked.current) {
      track('app_open');
      if (new URLSearchParams(window.location.search).get('source') === 'reminder') track('reminder_open');
      tracked.current = true;
    }
    return () => {
      cleanupTelegram();
      cleanupSync();
    };
  }, []);

  return (
    <>
      {!isGame && <NavBar />}
      {onboarding && <Onboarding onClose={() => setOnboarding(false)} />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:gameId" element={<GameShell key={location.pathname + location.search} />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  );
}

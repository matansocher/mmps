import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Home } from './pages/Home';
import { GameShell } from './pages/GameShell';
import { Stats } from './pages/Stats';
import { Settings } from './pages/Settings';
import { NavBar } from './components/NavBar';
import { DailyProgressModal } from './components/DailyProgressModal';
import { Onboarding, hasOnboarded } from './components/Onboarding';
import { initPlayerSync } from './lib/player-sync';

export default function App() {
  const location = useLocation();
  const isGame = location.pathname.startsWith('/game/');
  const [onboarding, setOnboarding] = useState(() => !hasOnboarded());

  // Allow Settings → "Replay intro" to relaunch the onboarding.
  useEffect(() => {
    const replay = () => setOnboarding(true);
    window.addEventListener('mindloop:replay-onboarding', replay);
    return () => window.removeEventListener('mindloop:replay-onboarding', replay);
  }, []);

  // Reconcile local progress with the backend once on startup (no-op when
  // there's no Telegram / dev identity — localStorage keeps working offline).
  useEffect(() => {
    const tg = (window as unknown as { Telegram?: { WebApp?: { ready?: () => void; expand?: () => void } } }).Telegram?.WebApp;
    tg?.ready?.();
    tg?.expand?.();
    void initPlayerSync();
  }, []);

  return (
    <>
      {!isGame && <NavBar />}
      {!isGame && !onboarding && <DailyProgressModal />}
      {onboarding && <Onboarding onClose={() => setOnboarding(false)} />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:gameId" element={<GameShell />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  );
}

import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { api } from '../lib/api';
import { BottomNav } from '../components/BottomNav';
import { ModeTile } from '../components/ModeTile';

export function HomePage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
    api.open().catch(() => {});
  }, []);

  return (
    <div className="min-h-full bg-bg-base flex flex-col">
      <header className="px-4 py-4 sticky top-0 bg-bg-base/85 backdrop-blur border-b border-border-subtle z-10">
        <h1 className="text-text-primary font-bold text-lg">🌍 Worldly</h1>
        <p className="text-text-secondary text-sm mt-1">בחרו משחק או התחילו רנדומלי</p>
      </header>

      <main className="flex-1 p-4 space-y-6">
        <section>
          <button
            onClick={() => setLocation('/play/random')}
            className="w-full rounded-2xl bg-accent-brand text-white font-bold text-lg py-5 active:scale-[0.99] transition-transform"
          >
            🎲 משחק אקראי
          </button>
        </section>

        <section>
          <h2 className="text-text-secondary text-sm mb-3">לפי סוג</h2>
          <div className="grid grid-cols-2 gap-3">
            <ModeTile href="/play/map" icon="🗺️" label="מפה" />
            <ModeTile href="/play/flag" icon="🏁" label="דגל" />
            <ModeTile href="/play/capital" icon="🏛️" label="עיר בירה" />
            <ModeTile href="/play/us_map" icon="🇺🇸" label="מפת ארה״ב" />
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

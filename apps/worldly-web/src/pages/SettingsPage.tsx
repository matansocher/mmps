import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { BottomNav } from '../components/BottomNav';
import { EmptyState } from '../components/EmptyState';
import { api } from '../lib/api';
import { showBackButton } from '../lib/telegram';

export function SettingsPage() {
  const [, setLocation] = useLocation();
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
    const cleanup = showBackButton(() => setLocation('/'));
    api.subscription().then((s) => setIsActive(s.isActive)).catch((e) => setError(String(e)));
    return cleanup;
  }, [setLocation]);

  const toggle = async () => {
    if (isActive === null || busy) return;
    setBusy(true);
    try {
      const next = !isActive;
      const res = await api.setSubscription(next);
      setIsActive(res.isActive);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-bg-base flex flex-col">
      <header className="px-4 py-4 sticky top-0 bg-bg-base/85 backdrop-blur border-b border-border-subtle z-10">
        <h1 className="text-text-primary font-bold text-lg">⚙️ הגדרות</h1>
      </header>

      <main className="flex-1 p-4 space-y-4">
        {error && <EmptyState title="שגיאה" hint={error} />}
        {isActive === null && !error && <EmptyState title="טוען..." />}
        {isActive !== null && (
          <section className="rounded-2xl bg-bg-card border border-border-subtle p-4 space-y-3">
            <div>
              <div className="text-text-primary font-semibold">משחקים יומיים</div>
              <div className="text-text-secondary text-sm mt-1">לקבל משחקים אוטומטיים כל יום בצ׳אט</div>
            </div>
            <button
              onClick={toggle}
              disabled={busy}
              className={`w-full rounded-xl py-3 font-semibold ${isActive ? 'bg-accent-bad/20 text-accent-bad border border-accent-bad' : 'bg-accent-ok/20 text-accent-ok border border-accent-ok'}`}
            >
              {isActive ? '🛑 הפסק לקבל' : '🟢 התחל לקבל'}
            </button>
          </section>
        )}

        <section className="rounded-2xl bg-bg-card border border-border-subtle p-4">
          <div className="text-text-primary font-semibold">📬 צור קשר</div>
          <div className="text-text-secondary text-sm mt-1">אפשר לדבר עם מי שיצר אותי דרך טלגרם.</div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

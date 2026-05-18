import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';
import type { CompetitionListItem, CompetitionsListResponse } from '../types';
import { BottomNav } from '../components/BottomNav';
import { EmptyState } from '../components/EmptyState';
import { FollowStar } from '../components/FollowStar';
import { Toast, type ToastState } from '../components/Toast';
import { leagueColor } from '../lib/league-themes';

export function CompetitionsPage() {
  const [data, setData] = useState<CompetitionsListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimer = useRef<number | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
    api.competitions().then(setData).catch((e) => setError(String(e)));
  }, []);

  function showToast(state: Exclude<ToastState, null>) {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(state);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }

  async function toggleFollow(item: CompetitionListItem) {
    const id = item.id;
    if (busyIds.has(id)) return;
    const desired = !item.following;

    setData((prev) => prev && { competitions: prev.competitions.map((c) => (c.id === id ? { ...c, following: desired } : c)) });
    setBusyIds((s) => new Set(s).add(id));

    try {
      const result = await api.setFollow(id, desired);
      setData((prev) => prev && { competitions: prev.competitions.map((c) => (c.id === id ? { ...c, following: result.following } : c)) });
      haptic(desired ? 'success' : 'select');
      showToast({ id: Date.now(), kind: 'success', message: desired ? `עוקב אחרי ${item.name}` : `הסרת מעקב מ-${item.name}` });
    } catch (err) {
      setData((prev) => prev && { competitions: prev.competitions.map((c) => (c.id === id ? { ...c, following: item.following } : c)) });
      haptic('error');
      showToast({ id: Date.now(), kind: 'error', message: 'העדכון נכשל, נסה שוב' });
      console.error('follow toggle failed', err);
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="min-h-full bg-bg-base flex flex-col">
      <header className="px-4 py-4 flex items-center justify-between sticky top-0 bg-bg-base/85 backdrop-blur border-b border-border-subtle z-10">
        <h1 className="text-text-primary font-bold text-lg">🏆 ליגות</h1>
        <span className="text-text-secondary text-xs">⭐ למעקב</span>
      </header>

      <main className="flex-1 p-4">
        {error ? (
          <EmptyState title="לא הצלחתי לטעון" hint={error} />
        ) : !data ? (
          <EmptyState title="טוען..." />
        ) : data.competitions.length === 0 ? (
          <EmptyState title="אין ליגות" />
        ) : (
          <div className="space-y-2">
            {data.competitions.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="bg-bg-card border border-border-subtle rounded-xl flex items-stretch overflow-hidden hover:bg-bg-elevated transition-colors"
              >
                <div style={{ background: leagueColor(c.id) }} className="w-1" />
                <button
                  onClick={() => navigate(`/league/${c.id}`)}
                  className="flex-1 p-3 flex items-center gap-3 text-right"
                >
                  <span className="text-2xl shrink-0">{c.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-text-primary font-medium truncate">{c.name}</div>
                    {!c.hasTable && <div className="text-text-muted text-xs">מחזור משחקים בלבד</div>}
                  </div>
                  <span className="text-text-muted text-lg">‹</span>
                </button>
                <div className="grid place-items-center pl-2 pr-1">
                  <FollowStar
                    following={c.following}
                    busy={busyIds.has(c.id)}
                    onToggle={() => toggleFollow(c)}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <Toast state={toast} />
      <BottomNav />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { getProfile } from '../lib/api';
import { PASSPORT_LOCALITIES } from '../lib/passport';
import type { PlayerProfile } from '../types';

export function LightUp() {
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void getProfile()
      .then(setProfile)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-geo-night">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-geo-line border-t-geo-orange" />
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="grid min-h-dvh place-items-center bg-geo-night p-6 text-center">
        <div>
          <p className="text-geo-muted">{error || 'Could not load Light Up Israel'}</p>
          <button type="button" onClick={() => navigate('/')} className="mt-4 min-h-11 rounded-2xl bg-geo-orange px-6 font-bold text-white">
            Back home
          </button>
        </div>
      </main>
    );
  }

  const { monthlyProgress } = profile;
  const litSet = new Set(monthlyProgress.litLocalities);
  const monthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <main className="min-h-dvh bg-geo-night px-5 pb-[max(32px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-2xl">
        <button type="button" onClick={() => navigate('/')} className="min-h-11 rounded-xl px-3 font-bold text-geo-muted focus:outline-none focus:ring-2 focus:ring-geo-orange">
          Back home
        </button>

        <div className="mt-6">
          <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-yellow-400">{monthName}</p>
          <h1 className="mt-2 font-display text-5xl">
            Light Up
            <br />
            <span className="text-yellow-400">Israel</span>
          </h1>
          <p className="mt-3 max-w-md text-geo-muted">
            Hit confidence circles during your first Daily Route attempt. Light up every locality this month to earn the exclusive share frame.
          </p>
        </div>

        {/* Progress */}
        <div className="mt-7 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-yellow-300">Progress</p>
              <p className="mt-1 font-display text-4xl text-yellow-300">
                {monthlyProgress.litCount} / {monthlyProgress.totalLocalities}
              </p>
            </div>
            {monthlyProgress.earned ? (
              <div className="text-right">
                <p className="text-xs font-extrabold uppercase tracking-wider text-yellow-300">Reward</p>
                <p className="mt-1 text-xl">🌟 Frame earned!</p>
              </div>
            ) : (
              <div className="text-right">
                <p className="text-xs font-extrabold uppercase tracking-wider text-geo-muted">Remaining</p>
                <p className="mt-1 font-display text-2xl text-geo-muted">{monthlyProgress.totalLocalities - monthlyProgress.litCount}</p>
              </div>
            )}
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/30">
            <div
              className="h-full rounded-full bg-yellow-400 transition-all"
              style={{ width: `${(monthlyProgress.litCount / monthlyProgress.totalLocalities) * 100}%` }}
            />
          </div>
        </div>

        {/* Reward info */}
        {monthlyProgress.cosmeticId ? (
          <div className="mt-4 rounded-2xl border border-yellow-400/30 bg-geo-surface p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-yellow-300">Monthly reward</p>
            <p className="mt-1 font-display text-xl">Light Up Israel Share Frame</p>
            <p className="mt-1 text-sm text-geo-muted">
              {monthlyProgress.earned ? 'You earned this frame — equip it in the Rewards shop.' : `Light up ${monthlyProgress.totalLocalities - monthlyProgress.litCount} more ${monthlyProgress.totalLocalities - monthlyProgress.litCount === 1 ? 'locality' : 'localities'} to earn this frame.`}
            </p>
          </div>
        ) : null}

        {/* Localities grid */}
        <div className="mt-7">
          <h2 className="font-display text-2xl">Localities</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PASSPORT_LOCALITIES.map((locality) => {
              const isLit = litSet.has(locality);
              return (
                <article
                  key={locality}
                  className={`rounded-2xl border p-4 ${isLit ? 'border-yellow-400/60 bg-yellow-400/10' : 'border-geo-line bg-geo-surface/60'}`}
                >
                  <div className={`mb-2 text-2xl ${isLit ? '' : 'grayscale'}`} aria-hidden="true">
                    {isLit ? '💛' : '🌑'}
                  </div>
                  <h3 className={`font-bold leading-tight ${isLit ? 'text-white' : 'text-geo-muted'}`}>{locality}</h3>
                  <p className={`mt-1 text-xs ${isLit ? 'font-bold text-yellow-400' : 'text-geo-muted'}`}>
                    {isLit ? 'Lit up ✓' : 'Not yet'}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={() => navigate('/daily')}
            className="min-h-14 w-full rounded-2xl bg-geo-orange px-6 py-4 font-display text-2xl shadow-action transition hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-white"
          >
            Play Daily Route
          </button>
        </div>
      </div>
    </main>
  );
}

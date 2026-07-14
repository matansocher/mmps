import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { trackAppOpen } from '../lib/analytics';
import { getProfile } from '../lib/api';
import type { PlayerProfile } from '../types';

export function Home() {
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    trackAppOpen();
    void getProfile()
      .then(setProfile)
      .catch((err: unknown) => setProfileError(err instanceof Error ? err.message : 'Could not load your profile'));
  }, []);

  const stamps = profile?.passportStamps.length ?? 0;
  const coins = profile?.coins ?? 0;
  const bestScore = profile?.bestScore ?? 0;
  const streak = profile?.currentDailyStreak ?? 0;

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-geo-night px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(32px,env(safe-area-inset-top))]">
      <div className="pointer-events-none absolute -right-24 top-8 h-64 w-64 rounded-full bg-geo-orange/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-28 bottom-16 h-72 w-72 rounded-full bg-geo-blue/20 blur-3xl" />
      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col">
        <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-geo-orange">Five places. One country.</p>
        <h1 className="mt-3 font-display text-6xl font-bold leading-[0.9] tracking-tight sm:text-7xl">
          Israel
          <br />
          <span className="text-geo-orange">Geo</span>
        </h1>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-geo-muted">
          Look around a real Israeli street, then draw a confidence circle. Small circles are worth more, but only if the street lands inside.
        </p>
        {profileError ? <p className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">{profileError}</p> : null}

        <div className="mt-8 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-geo-line bg-geo-surface/80 p-3">
            <p className="font-display text-2xl text-white">5</p>
            <p className="text-xs font-bold text-geo-muted">Rounds</p>
          </div>
          <div className="rounded-2xl border border-geo-line bg-geo-surface/80 p-3">
            <p className="font-display text-2xl text-white">25K</p>
            <p className="text-xs font-bold text-geo-muted">Max score</p>
          </div>
          <div className="rounded-2xl border border-geo-line bg-geo-surface/80 p-3">
            <p className="font-display text-2xl text-white">{bestScore.toLocaleString()}</p>
            <p className="text-xs font-bold text-geo-muted">Your best</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/daily')}
          className="mt-4 flex min-h-16 w-full items-center justify-between rounded-2xl border border-geo-blue/50 bg-geo-blue/10 px-4 text-left transition hover:border-geo-blue focus:outline-none focus:ring-2 focus:ring-geo-blue"
        >
          <span>
            <span className="block font-display text-xl">Daily Route</span>
            <span className="block text-xs font-bold text-geo-muted">One rewarded attempt per day · then practice</span>
          </span>
          <span className="text-right">
            <span className="block font-display text-xl text-geo-blue">{streak > 0 ? `🔥 ${streak}` : '—'}</span>
            <span className="block text-xs font-bold text-geo-muted">streak</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/passport')}
          className="mt-3 flex min-h-16 w-full items-center justify-between rounded-2xl border border-geo-line bg-geo-surface/80 px-4 text-left transition hover:border-geo-orange focus:outline-none focus:ring-2 focus:ring-geo-orange"
        >
          <span>
            <span className="block font-display text-xl">Israel Passport</span>
            <span className="block text-xs font-bold text-geo-muted">Hit circles to collect locality stamps</span>
          </span>
          <span className="font-display text-2xl text-geo-orange">{stamps}/18</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/light-up')}
          className="mt-3 flex min-h-16 w-full items-center justify-between rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 text-left transition hover:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-300"
        >
          <span>
            <span className="block font-display text-xl">Light Up Israel</span>
            <span className="block text-xs font-bold text-geo-muted">Discover all 18 localities this month</span>
          </span>
          <span className="font-display text-2xl text-yellow-300">
            {profile?.monthlyProgress ? `${profile.monthlyProgress.litCount}/${profile.monthlyProgress.totalLocalities}` : '—'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/rewards')}
          className="mt-3 flex min-h-16 w-full items-center justify-between rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 text-left transition hover:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          <span>
            <span className="block font-display text-xl">Rewards Shop</span>
            <span className="block text-xs font-bold text-geo-muted">Unlock covers, maps, pins, and frames</span>
          </span>
          <span className="text-right">
            <span className="block font-display text-2xl text-amber-300">{coins.toLocaleString()}</span>
            <span className="block text-xs font-bold text-amber-200">coins</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="mt-3 flex min-h-16 w-full items-center justify-between rounded-2xl border border-geo-line bg-geo-surface/80 px-4 text-left transition hover:border-geo-orange focus:outline-none focus:ring-2 focus:ring-geo-orange"
        >
          <span>
            <span className="block font-display text-xl">Navigator Profile</span>
            <span className="block text-xs font-bold text-geo-muted">
              {profile ? `${profile.displayName} · Lv ${profile.level} ${profile.title}` : 'View stats and share your journey'}
            </span>
          </span>
          <span className="text-xl">🧭</span>
        </button>

        <div className="mt-auto pt-10">
          <button
            type="button"
            onClick={() => navigate('/play')}
            className="min-h-14 w-full rounded-2xl bg-geo-orange px-6 py-4 font-display text-2xl font-semibold text-white shadow-action transition hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-white active:scale-[0.98]"
          >
            Start exploring
          </button>
          <p className="mt-4 text-center text-sm text-geo-muted">Rotate and zoom only. No moving down the road.</p>
        </div>
      </div>
    </main>
  );
}

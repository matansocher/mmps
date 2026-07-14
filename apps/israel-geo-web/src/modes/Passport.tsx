import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { getProfile } from '../lib/api';
import { PASSPORT_LOCALITIES } from '../lib/passport';
import { getCosmeticGradient } from '../lib/cosmetic-rendering';
import type { LocalityMastery, PlayerProfile } from '../types';

const MASTERY_TIER_LABELS: Readonly<Record<LocalityMastery['tier'], string>> = {
  none: '—',
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  crown: '👑',
};

function getMastery(localityMastery: readonly LocalityMastery[], locality: string): LocalityMastery | undefined {
  return localityMastery.find((m) => m.locality === locality);
}

export function Passport() {
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void getProfile()
      .then(setProfile)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load passport'))
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
          <p className="text-geo-muted">{error || 'Could not load passport'}</p>
          <button type="button" onClick={() => navigate('/')} className="mt-4 min-h-11 rounded-2xl bg-geo-orange px-6 font-bold text-white">
            Back home
          </button>
        </div>
      </main>
    );
  }

  const stamps = new Map(profile.passportStamps.map((stamp) => [stamp.locality, stamp]));
  const coverId = profile.equippedCosmetics['passport-cover'];

  return (
    <main className="min-h-dvh bg-geo-night px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-2xl">
        <button type="button" onClick={() => navigate('/')} className="min-h-11 rounded-xl px-3 font-bold text-geo-muted focus:outline-none focus:ring-2 focus:ring-geo-orange">
          Back home
        </button>
        <div
          className="mt-6 overflow-hidden rounded-3xl border border-geo-line p-6 shadow-2xl"
          style={{ background: `linear-gradient(rgb(0 0 0 / 28%), rgb(0 0 0 / 28%)), ${getCosmeticGradient(coverId)}` }}
        >
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-white/80">Your collection</p>
          <h1 className="mt-2 font-display text-5xl">Israel Passport</h1>
          <p className="mt-3 max-w-xl text-white/80">Hit a confidence circle in a locality to earn its stamp. Return with a smaller successful circle to improve your precision record.</p>
        </div>
        <div className="mt-6 rounded-2xl border border-geo-line bg-geo-surface p-4">
          <div className="flex items-end justify-between">
            <p className="font-display text-4xl">
              {stamps.size} / {PASSPORT_LOCALITIES.length}
            </p>
            <p className="text-sm font-bold text-geo-muted">stamps collected</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-geo-line">
            <div className="h-full rounded-full bg-geo-orange" style={{ width: `${(stamps.size / PASSPORT_LOCALITIES.length) * 100}%` }} />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PASSPORT_LOCALITIES.map((locality) => {
            const stamp = stamps.get(locality);
            const mastery = getMastery(profile.localityMastery, locality);
            return (
              <article key={locality} className={`min-h-36 rounded-2xl border p-4 ${stamp ? 'border-geo-orange bg-geo-orange/10' : 'border-geo-line bg-geo-surface/60'}`}>
                <div className="flex items-center justify-between">
                  <div
                    className={`grid h-12 w-12 place-items-center rounded-full border-2 font-display text-lg ${stamp ? 'border-geo-orange text-geo-orange' : 'border-geo-line text-geo-muted'}`}
                    aria-hidden="true"
                  >
                    {stamp ? '✓' : '—'}
                  </div>
                  {mastery && mastery.tier !== 'none' ? (
                    <span className="text-xl" title={`Mastery tier ${mastery.tier}`}>
                      {MASTERY_TIER_LABELS[mastery.tier]}
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-3 font-bold leading-tight">{locality}</h2>
                <p className="mt-1 text-xs text-geo-muted">{stamp ? `Best circle: ${stamp.bestRadiusKm} km` : 'Not discovered yet'}</p>
                {mastery && mastery.points > 0 ? (
                  <p className="mt-1 text-xs font-bold text-geo-orange">{mastery.points} mastery pts</p>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}

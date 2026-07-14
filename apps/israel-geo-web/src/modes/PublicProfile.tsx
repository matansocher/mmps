import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { getPublicProfile } from '../lib/api';
import { PASSPORT_LOCALITIES } from '../lib/passport';
import type { CrownTier, PublicProfile as PublicProfileType } from '../types';

const CROWN_LABELS: Readonly<Record<CrownTier, string>> = {
  none: '—',
  bronze: '🥉 Bronze',
  silver: '🥈 Silver',
  gold: '🥇 Gold',
  crown: '👑 Crown',
};

const AVATAR_GRADIENTS: Readonly<Record<string, string>> = {
  'navigator-coast': 'linear-gradient(135deg, #0EA5E9, #1E3A8A)',
  'navigator-desert': 'linear-gradient(135deg, #FB923C, #7C2D12)',
  'navigator-city': 'linear-gradient(135deg, #8B5CF6, #111827)',
  'navigator-north': 'linear-gradient(135deg, #22C55E, #1A3A1A)',
  'navigator-galilee': 'linear-gradient(135deg, #14B8A6, #134E4A)',
  'navigator-negev': 'linear-gradient(135deg, #F59E0B, #78350F)',
};

const AVATAR_EMOJIS: Readonly<Record<string, string>> = {
  'navigator-coast': '🌊',
  'navigator-desert': '🏜️',
  'navigator-city': '🏙️',
  'navigator-north': '⛰️',
  'navigator-galilee': '🌿',
  'navigator-negev': '🌵',
};

function getAvatarGradient(id: string): string {
  return AVATAR_GRADIENTS[id] ?? 'linear-gradient(135deg, #193049, #102033)';
}

function getAvatarEmoji(id: string): string {
  return AVATAR_EMOJIS[id] ?? '🧭';
}

export function PublicProfile() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? '';
  const [profile, setProfile] = useState<PublicProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid profile link');
      setLoading(false);
      return;
    }
    void getPublicProfile(token)
      .then(setProfile)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Profile not found'))
      .finally(() => setLoading(false));
  }, [token]);

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
          <h1 className="font-display text-3xl">Profile not found</h1>
          <p className="mt-3 text-geo-muted">{error || 'This share link may have expired or been replaced.'}</p>
          <a href="/israel-geo/" className="mt-6 inline-block min-h-11 rounded-2xl bg-geo-orange px-6 py-2 font-bold text-white">
            Play Israel Geo
          </a>
        </div>
      </main>
    );
  }

  const stamps = new Map(profile.passportStamps.map((stamp) => [stamp.locality, stamp]));

  return (
    <main className="min-h-dvh bg-geo-night px-5 pb-[max(32px,env(safe-area-inset-bottom))] pt-[max(32px,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-lg">
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-geo-orange">Navigator Profile</p>

        {/* Avatar & name */}
        <div className="mt-6 flex items-center gap-5">
          <div
            className="grid h-20 w-20 shrink-0 place-items-center rounded-full text-4xl shadow-lg"
            style={{ background: getAvatarGradient(profile.avatarId) }}
          >
            {getAvatarEmoji(profile.avatarId)}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-3xl">{profile.displayName}</h1>
            <p className="text-sm text-geo-muted">
              Lv {profile.level} · {profile.title}
            </p>
            <p className="text-sm font-bold text-geo-orange">{CROWN_LABELS[profile.crownTier]}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-geo-line bg-geo-surface p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-geo-muted">Best score</p>
            <p className="mt-1 font-display text-3xl">{profile.bestScore.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-geo-line bg-geo-surface p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-geo-muted">Games played</p>
            <p className="mt-1 font-display text-3xl">{profile.gamesPlayed.toLocaleString()}</p>
          </div>
        </div>

        {/* Badges */}
        {profile.badges.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-geo-line bg-geo-surface p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-geo-muted">Badges</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.badges.map((badge) => (
                <span key={badge} className="rounded-full border border-geo-orange/40 bg-geo-orange/10 px-3 py-1 text-sm font-bold text-geo-orange">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Passport stamps */}
        <div className="mt-6 rounded-2xl border border-geo-line bg-geo-surface p-4">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl">Israel Passport</h2>
            <p className="font-display text-xl text-geo-orange">
              {stamps.size}/{PASSPORT_LOCALITIES.length}
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-geo-line">
            <div className="h-full rounded-full bg-geo-orange" style={{ width: `${(stamps.size / PASSPORT_LOCALITIES.length) * 100}%` }} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PASSPORT_LOCALITIES.map((locality) => {
            const stamp = stamps.get(locality);
            return (
              <div
                key={locality}
                className={`rounded-xl border px-3 py-2 text-sm ${stamp ? 'border-geo-orange bg-geo-orange/10' : 'border-geo-line bg-geo-surface/60'}`}
              >
                <span className="mr-1">{stamp ? '✓' : '—'}</span>
                <span className={stamp ? 'font-bold' : 'text-geo-muted'}>{locality}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <a href="/israel-geo/" className="inline-block min-h-12 rounded-2xl bg-geo-orange px-8 py-3 font-display text-xl font-bold text-white shadow-action">
            Play Israel Geo
          </a>
        </div>
      </div>
    </main>
  );
}

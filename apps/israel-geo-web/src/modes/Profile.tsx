import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { createShareToken, getProfile, updateProfile } from '../lib/api';
import { getCosmeticGradient } from '../lib/cosmetic-rendering';
import { PASSPORT_LOCALITIES } from '../lib/passport';
import type { CrownTier, PlayerProfile } from '../types';

type AvatarOption = {
  readonly id: string;
  readonly label: string;
  readonly emoji: string;
  readonly gradient: string;
};

const AVATAR_OPTIONS: readonly AvatarOption[] = [
  { id: 'navigator-coast', label: 'Coast', emoji: '🌊', gradient: 'linear-gradient(135deg, #0EA5E9, #1E3A8A)' },
  { id: 'navigator-desert', label: 'Desert', emoji: '🏜️', gradient: 'linear-gradient(135deg, #FB923C, #7C2D12)' },
  { id: 'navigator-city', label: 'City', emoji: '🏙️', gradient: 'linear-gradient(135deg, #8B5CF6, #111827)' },
  { id: 'navigator-north', label: 'North', emoji: '⛰️', gradient: 'linear-gradient(135deg, #22C55E, #1A3A1A)' },
  { id: 'navigator-galilee', label: 'Galilee', emoji: '🌿', gradient: 'linear-gradient(135deg, #14B8A6, #134E4A)' },
  { id: 'navigator-negev', label: 'Negev', emoji: '🌵', gradient: 'linear-gradient(135deg, #F59E0B, #78350F)' },
];

const CROWN_LABELS: Readonly<Record<CrownTier, string>> = {
  none: '—',
  bronze: '🥉 Bronze',
  silver: '🥈 Silver',
  gold: '🥇 Gold',
  crown: '👑 Crown',
};

function getAvatarOption(id: string): AvatarOption {
  return AVATAR_OPTIONS.find((option) => option.id === id) ?? AVATAR_OPTIONS[0];
}

export function Profile() {
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);

  useEffect(() => {
    void getProfile()
      .then((p) => {
        setProfile(p);
        setEditName(p.displayName);
        setEditAvatar(p.avatarId);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load profile'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(): Promise<void> {
    if (!editName.trim()) return;
    setSaving(true);
    setSaveError('');
    try {
      const updated = await updateProfile({ displayName: editName.trim(), avatarId: editAvatar });
      setProfile(updated);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  async function handleShareLink(): Promise<void> {
    setGeneratingLink(true);
    setCopyStatus('');
    try {
      const result = await createShareToken();
      const url = `${window.location.origin}${result.path}`;
      setShareLink(url);
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopyStatus('Copied to clipboard!');
      } else {
        setCopyStatus('Link created — copy it below');
      }
    } catch (err) {
      setCopyStatus(err instanceof Error ? err.message : 'Could not generate link');
    } finally {
      setGeneratingLink(false);
    }
  }

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
          <p className="text-geo-muted">{error || 'Could not load profile'}</p>
          <button type="button" onClick={() => navigate('/')} className="mt-4 min-h-11 rounded-2xl bg-geo-orange px-6 font-bold text-white">
            Back home
          </button>
        </div>
      </main>
    );
  }

  const avatar = getAvatarOption(profile.avatarId);

  return (
    <main className="min-h-dvh bg-geo-night px-5 pb-[max(32px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-lg">
        <button type="button" onClick={() => navigate('/')} className="min-h-11 rounded-xl px-3 font-bold text-geo-muted focus:outline-none focus:ring-2 focus:ring-geo-orange">
          Back home
        </button>

        {/* Avatar & name */}
        <div className="mt-6 flex items-center gap-5">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full text-4xl shadow-lg" style={{ background: avatar.gradient }}>
            {avatar.emoji}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold uppercase tracking-widest text-geo-orange">Navigator Profile</p>
            <h1 className="mt-1 truncate font-display text-3xl">{profile.displayName}</h1>
            <p className="text-sm text-geo-muted">
              Lv {profile.level} · {profile.title}
            </p>
          </div>
        </div>

        {/* XP bar */}
        <div className="mt-5 rounded-2xl border border-geo-line bg-geo-surface p-4">
          <div className="flex items-end justify-between">
            <p className="text-sm font-bold text-geo-muted">Experience</p>
            <p className="font-display text-lg text-geo-orange">
              {profile.xp} / {profile.xpForNextLevel} XP
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-geo-line">
            <div className="h-full rounded-full bg-geo-orange transition-all" style={{ width: `${Math.min(100, (profile.xp / profile.xpForNextLevel) * 100)}%` }} />
          </div>
        </div>

        {/* Stats grid */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-geo-line bg-geo-surface p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-geo-muted">Best score</p>
            <p className="mt-1 font-display text-3xl">{profile.bestScore.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-geo-line bg-geo-surface p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-geo-muted">Games played</p>
            <p className="mt-1 font-display text-3xl">{profile.gamesPlayed.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-geo-line bg-geo-surface p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-geo-muted">Passport stamps</p>
            <p className="mt-1 font-display text-3xl">
              {profile.passportStamps.length}/{PASSPORT_LOCALITIES.length}
            </p>
          </div>
          <div className="rounded-2xl border border-geo-line bg-geo-surface p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-geo-muted">Compass Coins</p>
            <p className="mt-1 font-display text-3xl text-amber-300">{profile.coins.toLocaleString()}</p>
          </div>
        </div>

        {/* Daily streak */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-geo-blue/40 bg-geo-blue/10 p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-geo-blue">Daily streak</p>
            <p className="mt-1 font-display text-3xl">
              {profile.currentDailyStreak > 0 ? `🔥 ${profile.currentDailyStreak}` : '—'}
            </p>
          </div>
          <div className="rounded-2xl border border-geo-line bg-geo-surface p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-geo-muted">Best streak</p>
            <p className="mt-1 font-display text-3xl">{profile.bestDailyStreak}</p>
          </div>
        </div>

        {/* Crown tier */}
        <div className="mt-3 rounded-2xl border border-geo-line bg-geo-surface p-4">
          <p className="text-xs font-extrabold uppercase tracking-wider text-geo-muted">Crown tier</p>
          <p className="mt-1 font-display text-2xl">{CROWN_LABELS[profile.crownTier]}</p>
        </div>

        {/* Monthly progress */}
        <div className="mt-3 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-4">
          <p className="text-xs font-extrabold uppercase tracking-wider text-yellow-300">Light Up Israel — this month</p>
          <p className="mt-1 font-display text-2xl">
            {profile.monthlyProgress.litCount}/{profile.monthlyProgress.totalLocalities} localities
          </p>
          {profile.monthlyProgress.earned ? (
            <p className="mt-1 text-sm font-bold text-yellow-300">🌟 Monthly frame earned!</p>
          ) : null}
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

        {/* Equipped cosmetics */}
        {Object.keys(profile.equippedCosmetics).length > 0 ? (
          <div className="mt-4 rounded-2xl border border-geo-line bg-geo-surface p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-geo-muted">Equipped cosmetics</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(Object.entries(profile.equippedCosmetics) as [string, string][]).map(([category, cosmeticId]) => (
                <div key={category} className="overflow-hidden rounded-xl border border-geo-line">
                  <div className="h-10" style={{ background: getCosmeticGradient(cosmeticId) }} aria-hidden="true" />
                  <p className="px-2 py-1 text-xs font-bold capitalize text-geo-muted">{category.replace('-', ' ')}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Edit profile */}
        {editing ? (
          <section className="mt-6 rounded-2xl border border-geo-orange/40 bg-geo-surface p-5">
            <h2 className="font-display text-2xl">Edit profile</h2>
            <div className="mt-4">
              <label className="block text-sm font-bold text-geo-muted" htmlFor="display-name">
                Display name
              </label>
              <input
                id="display-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={32}
                className="mt-2 w-full rounded-xl border border-geo-line bg-geo-elevated px-4 py-3 font-bold text-white focus:outline-none focus:ring-2 focus:ring-geo-orange"
              />
            </div>
            <div className="mt-4">
              <p className="text-sm font-bold text-geo-muted">Avatar</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {AVATAR_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setEditAvatar(option.id)}
                    className={`flex flex-col items-center gap-1 rounded-xl p-3 transition focus:outline-none focus:ring-2 focus:ring-geo-orange ${editAvatar === option.id ? 'border-2 border-geo-orange bg-geo-orange/10' : 'border border-geo-line bg-geo-elevated'}`}
                  >
                    <div className="grid h-12 w-12 place-items-center rounded-full text-2xl" style={{ background: option.gradient }}>
                      {option.emoji}
                    </div>
                    <span className="text-xs font-bold text-geo-muted">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {saveError ? <p className="mt-3 text-sm font-bold text-red-400">{saveError}</p> : null}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !editName.trim()}
                className="min-h-12 flex-1 rounded-2xl bg-geo-orange px-4 font-bold text-white focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setSaveError('');
                }}
                className="min-h-12 rounded-2xl border border-geo-line px-4 font-bold text-geo-muted focus:outline-none focus:ring-2 focus:ring-geo-orange"
              >
                Cancel
              </button>
            </div>
          </section>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-6 min-h-12 w-full rounded-2xl border border-geo-line bg-geo-surface px-4 font-bold text-geo-muted focus:outline-none focus:ring-2 focus:ring-geo-orange"
          >
            Edit name & avatar
          </button>
        )}

        {/* Share link */}
        <div className="mt-4 rounded-2xl border border-geo-line bg-geo-surface p-4">
          <p className="text-sm font-bold text-geo-muted">Share your profile with a private link</p>
          <button
            type="button"
            onClick={() => void handleShareLink()}
            disabled={generatingLink}
            className="mt-3 min-h-12 w-full rounded-2xl bg-geo-elevated px-4 font-bold text-white focus:outline-none focus:ring-2 focus:ring-geo-orange disabled:opacity-50"
          >
            {generatingLink ? 'Generating...' : shareLink ? 'Generate new link' : 'Generate share link'}
          </button>
          {copyStatus ? <p className="mt-2 text-center text-sm font-bold text-geo-orange">{copyStatus}</p> : null}
          {shareLink ? (
            <p className="mt-2 break-all rounded-xl bg-geo-elevated px-3 py-2 text-xs text-geo-muted">{shareLink}</p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

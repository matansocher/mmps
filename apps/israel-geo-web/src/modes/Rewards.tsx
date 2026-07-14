import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { equipCosmetic as apiEquipCosmetic, getProfile, previewCosmetic as apiPreviewCosmetic, purchaseCosmetic as apiPurchaseCosmetic } from '../lib/api';
import { CATEGORY_LABELS, getCosmeticPrice, getWeeklyFeaturedCosmetic, PASSPORT_REWARD_COSMETICS, SHOP_COSMETICS } from '../lib/cosmetics';
import { getCosmeticGradient } from '../lib/cosmetic-rendering';
import { isWeeklyPreviewAvailable } from '../lib/storage';
import type { CosmeticCategory, PlayerProfile } from '../types';

const CATEGORIES: readonly CosmeticCategory[] = ['passport-cover', 'map-theme', 'pin', 'share-frame'];

export function Rewards() {
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const featured = getWeeklyFeaturedCosmetic();

  useEffect(() => {
    void getProfile()
      .then(setProfile)
      .catch((err: unknown) => setMessage(err instanceof Error ? err.message : 'Could not load shop'))
      .finally(() => setLoading(false));
  }, []);

  const previewQueued = profile?.previewCosmeticId === featured.id;

  async function buyOrEquip(cosmeticId: string): Promise<void> {
    if (busy || !profile) return;
    setBusy(true);
    setMessage('');
    try {
      const owned = profile.ownedCosmeticIds.includes(cosmeticId);
      const updated = owned ? await apiEquipCosmetic(cosmeticId) : await apiPurchaseCosmetic(cosmeticId);
      setProfile(updated);
      setMessage(owned ? 'Cosmetic equipped' : 'Purchased and equipped');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not update this cosmetic');
    } finally {
      setBusy(false);
    }
  }

  async function queuePreview(): Promise<void> {
    if (busy || !profile) return;
    setBusy(true);
    setMessage('');
    try {
      const updated = await apiPreviewCosmetic(featured.id);
      setProfile(updated);
      setMessage(`${featured.name} will be equipped for your next game`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not queue preview');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-geo-night">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-geo-line border-t-geo-orange" />
      </main>
    );
  }

  const coins = profile?.coins ?? 0;
  const ownedCosmeticIds = profile?.ownedCosmeticIds ?? [];
  const equippedCosmetics = profile?.equippedCosmetics ?? {};
  const previewAvailable = profile ? isWeeklyPreviewAvailable(profile) : false;

  return (
    <main className="min-h-dvh bg-geo-night px-5 pb-[max(32px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between gap-4">
          <button type="button" onClick={() => navigate('/')} className="min-h-11 rounded-xl px-3 font-bold text-geo-muted focus:outline-none focus:ring-2 focus:ring-geo-orange">
            Back home
          </button>
          <div className="rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-right">
            <p className="text-xs font-extrabold uppercase tracking-wider text-amber-300">Compass Coins</p>
            <p className="font-display text-2xl text-amber-300">{coins.toLocaleString()}</p>
          </div>
        </header>

        <p className="mt-7 text-sm font-extrabold uppercase tracking-[0.2em] text-geo-orange">Rewards shop</p>
        <h1 className="mt-2 font-display text-5xl">Make the journey yours</h1>
        <p className="mt-3 max-w-2xl text-geo-muted">Coins unlock visual rewards only. Every item stays available, while one featured cosmetic receives a weekly discount and a one-game preview.</p>

        <section className="mt-7 overflow-hidden rounded-3xl border border-amber-400/40 bg-geo-surface">
          <div className="h-28" style={{ background: getCosmeticGradient(featured.id) }} aria-hidden="true" />
          <div className="p-5">
            <p className="text-xs font-extrabold uppercase tracking-wider text-amber-300">Weekly feature · 20% off</p>
            <div className="mt-2 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl">{featured.name}</h2>
                <p className="mt-1 text-sm text-geo-muted">{featured.description}</p>
              </div>
              <p className="shrink-0 font-display text-2xl text-amber-300">{getCosmeticPrice(featured)} coins</p>
            </div>
            <button
              type="button"
              disabled={busy || !previewAvailable || previewQueued || ownedCosmeticIds.includes(featured.id)}
              onClick={() => void queuePreview()}
              className="mt-4 min-h-12 w-full rounded-2xl border border-amber-300/50 px-4 font-bold text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {ownedCosmeticIds.includes(featured.id)
                ? 'Already owned'
                : previewQueued
                  ? 'Ready for your next game'
                  : previewAvailable
                    ? 'Preview for one game'
                    : 'Weekly preview used'}
            </button>
          </div>
        </section>

        <p className="mt-4 min-h-6 text-center text-sm font-bold text-geo-orange" aria-live="polite">
          {message}
        </p>

        {CATEGORIES.map((category) => (
          <section key={category} className="mt-7">
            <h2 className="font-display text-3xl">{CATEGORY_LABELS[category]}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {SHOP_COSMETICS.filter((cosmetic) => cosmetic.category === category).map((cosmetic) => {
                const owned = ownedCosmeticIds.includes(cosmetic.id);
                const equipped = equippedCosmetics[category] === cosmetic.id;
                const price = getCosmeticPrice(cosmetic);
                const discounted = price !== cosmetic.price;
                return (
                  <article key={cosmetic.id} className="overflow-hidden rounded-2xl border border-geo-line bg-geo-surface">
                    <div className="h-24" style={{ background: getCosmeticGradient(cosmetic.id) }} aria-hidden="true" />
                    <div className="p-4">
                      <h3 className="font-display text-xl">{cosmetic.name}</h3>
                      <p className="mt-1 min-h-10 text-sm text-geo-muted">{cosmetic.description}</p>
                      <div className="mt-4 flex items-center justify-between gap-2">
                        <p className="font-bold text-amber-300">
                          {owned ? 'Owned' : `${price} coins`}
                          {!owned && discounted ? <span className="ml-2 text-xs font-normal text-geo-muted">(normally <span className="line-through">{cosmetic.price}</span>)</span> : null}
                        </p>
                        <button
                          type="button"
                          disabled={busy || equipped}
                          onClick={() => void buyOrEquip(cosmetic.id)}
                          className="min-h-11 rounded-xl bg-geo-orange px-4 font-bold focus:outline-none focus:ring-2 focus:ring-white disabled:cursor-default disabled:bg-geo-elevated disabled:text-geo-muted"
                        >
                          {equipped ? 'Equipped' : owned ? 'Equip' : 'Buy'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
              {/* Render equipped monthly cosmetic if active */}
              {category === 'share-frame' && equippedCosmetics['share-frame']?.startsWith('frame-light-up-') ? (
                <article className="overflow-hidden rounded-2xl border border-yellow-400/60 bg-geo-surface">
                  <div className="h-24" style={{ background: getCosmeticGradient(equippedCosmetics['share-frame']) }} aria-hidden="true" />
                  <div className="p-4">
                    <h3 className="font-display text-xl">Light Up Israel</h3>
                    <p className="mt-1 min-h-10 text-sm text-geo-muted">Monthly Light Up Israel reward frame — earned this month.</p>
                    <p className="mt-4 font-bold text-yellow-300">Equipped · Monthly reward</p>
                  </div>
                </article>
              ) : null}
            </div>
          </section>
        ))}

        <section className="mt-9">
          <p className="text-xs font-extrabold uppercase tracking-wider text-geo-orange">Cannot be purchased</p>
          <h2 className="mt-1 font-display text-3xl">Passport exclusives</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PASSPORT_REWARD_COSMETICS.map((cosmetic) => {
              const owned = ownedCosmeticIds.includes(cosmetic.id);
              const equipped = equippedCosmetics[cosmetic.category] === cosmetic.id;
              return (
                <article key={cosmetic.id} className={`overflow-hidden rounded-2xl border ${owned ? 'border-geo-orange bg-geo-orange/10' : 'border-geo-line bg-geo-surface/60'}`}>
                  <div className="h-16" style={{ background: getCosmeticGradient(cosmetic.id), filter: owned ? undefined : 'grayscale(1)' }} aria-hidden="true" />
                  <div className="p-3">
                    <h3 className="font-bold">{cosmetic.name}</h3>
                    <p className="mt-1 text-xs text-geo-muted">{cosmetic.passportMilestone} Passport stamps</p>
                    {owned ? (
                      <button
                        type="button"
                        disabled={busy || equipped}
                        onClick={() => void buyOrEquip(cosmetic.id)}
                        className="mt-3 min-h-11 w-full rounded-xl border border-geo-orange px-2 text-sm font-bold text-geo-orange disabled:border-geo-line disabled:text-geo-muted"
                      >
                        {equipped ? 'Equipped' : 'Equip'}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

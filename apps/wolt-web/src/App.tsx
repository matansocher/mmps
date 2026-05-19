import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertsStrip } from './components/AlertsStrip';
import { FilterBar } from './components/FilterBar';
import { RestaurantGrid } from './components/RestaurantGrid';
import { SearchBar } from './components/SearchBar';
import { SettingsSheet } from './components/SettingsSheet';
import { Toast } from './components/Toast';
import { api } from './lib/api';
import { applyFilters, DEFAULT_FILTERS, Filters, formatCityLabel, listCities, listTopCuisines, searchByName, sortByCityFirst } from './lib/filters';
import { getWebApp, haptic, openExternal } from './lib/telegram';
import type { RestaurantItem, SubscribeResponse, SubscriptionItem } from './types';

type ToastState = { message: string; kind: 'success' | 'error' | 'info' } | null;

const PAGE_SIZE = 20;

export function App() {
  const [restaurants, setRestaurants] = useState<ReadonlyArray<RestaurantItem>>([]);
  const [subscriptions, setSubscriptions] = useState<ReadonlyArray<SubscriptionItem>>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  useEffect(() => {
    const w = getWebApp();
    if (w) {
      w.ready();
      w.expand();
    }
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const [r, s, p] = await Promise.all([api.restaurants(), api.subscriptions(), api.preferences()]);
      setRestaurants(r.restaurants);
      setSubscriptions(s.subscriptions);
      setFilters((prev) => ({ ...prev, city: p.city }));
    } catch {
      setToast({ message: 'שגיאה בטעינה', kind: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleCityChange(city: string | null) {
    setFilters((prev) => ({ ...prev, city }));
    try {
      await api.updatePreferences(city);
    } catch {
      setToast({ message: 'שגיאה בשמירת ההגדרה', kind: 'error' });
    }
  }

  async function refreshSubscriptions() {
    try {
      const s = await api.subscriptions();
      setSubscriptions(s.subscriptions);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const subscribedNames = useMemo(() => new Set(subscriptions.map((s) => s.restaurant)), [subscriptions]);
  const cities = useMemo(() => listCities(restaurants), [restaurants]);
  const cuisineOptions = useMemo(() => listTopCuisines(restaurants, 14), [restaurants]);

  const visible = useMemo(() => {
    const searched = query.trim() ? searchByName(restaurants, query) : restaurants;
    const filtered = applyFilters(searched, filters);
    return sortByCityFirst(filtered, filters.city);
  }, [restaurants, query, filters]);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, filters]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    if (visibleCount >= visible.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, visible.length));
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, visible.length]);

  const paged = useMemo(() => visible.slice(0, visibleCount), [visible, visibleCount]);
  const hasMore = visibleCount < visible.length;

  function handleSubscribeResult(res: SubscribeResponse) {
    switch (res.status) {
      case 'subscribed':
        haptic('success');
        setToast({ message: '🚨 ניצור עבורך התראה', kind: 'success' });
        refreshSubscriptions();
        break;
      case 'already_subscribed':
        setToast({ message: 'כבר יש לך התראה על המסעדה', kind: 'info' });
        break;
      case 'already_open':
        haptic('success');
        setToast({ message: '🟢 המסעדה כבר פתוחה — פתחנו לך את וולט', kind: 'success' });
        openExternal(res.link);
        break;
      case 'limit_reached':
        haptic('error');
        setToast({ message: `הגעת למקסימום ${res.max} התראות`, kind: 'error' });
        break;
      case 'not_found':
        haptic('error');
        setToast({ message: 'המסעדה לא נמצאה', kind: 'error' });
        break;
    }
  }

  async function onCardTap(r: RestaurantItem) {
    if (r.isOnline) {
      haptic('select');
      openExternal(r.link);
      return;
    }
    try {
      const res = await api.subscribe(r.name);
      handleSubscribeResult(res);
    } catch {
      setToast({ message: 'שגיאה בהוספת התראה', kind: 'error' });
    }
  }

  async function onRemoveAlert(restaurant: string) {
    try {
      await api.unsubscribe(restaurant);
      haptic('select');
      setSubscriptions((prev) => prev.filter((s) => s.restaurant !== restaurant));
    } catch {
      setToast({ message: 'שגיאה בהסרת התראה', kind: 'error' });
    }
  }

  const gridTitle = query.trim() ? `תוצאות: "${query}"` : filters.openOnly ? 'פתוחות עכשיו' : 'כל המסעדות';

  return (
    <div className="min-h-full max-w-2xl mx-auto px-4 py-4 flex flex-col gap-3">
      <header className="grid grid-cols-3 items-center">
        <h1 className="text-xl font-bold tracking-tight justify-self-start" dir="ltr">🍔 Wolt</h1>
        <div className="text-xs text-text-muted justify-self-center truncate" dir="ltr">
          {filters.city ? formatCityLabel(filters.city) : 'כל הערים'}
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="justify-self-end text-text-secondary hover:text-text-primary p-2 -m-2 rounded-full"
          aria-label="settings"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      <SearchBar value={query} onChange={setQuery} />

      <FilterBar filters={filters} cuisineOptions={cuisineOptions} onChange={setFilters} />

      {!query && <AlertsStrip subscriptions={subscriptions} onRemove={onRemoveAlert} />}

      {loading ? (
        <div className="text-center text-text-muted py-10 text-sm">טוען...</div>
      ) : (
        <>
          <RestaurantGrid
            title={gridTitle}
            restaurants={paged}
            total={visible.length}
            subscribedNames={subscribedNames}
            onTap={onCardTap}
            emptyMessage={query ? 'לא מצאנו מסעדה שמתאימה לחיפוש' : 'אין מסעדות שמתאימות לסינון'}
          />
          {hasMore && (
            <div ref={sentinelRef} className="text-center text-text-muted py-4 text-xs">
              טוען עוד...
            </div>
          )}
        </>
      )}

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        cities={cities}
        city={filters.city}
        onCityChange={handleCityChange}
      />

      {toast && <Toast message={toast.message} kind={toast.kind} onDismiss={() => setToast(null)} />}
    </div>
  );
}

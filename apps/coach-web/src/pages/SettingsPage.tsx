import { type ReactNode, useEffect, useRef, useState } from 'react';
import { CompetitionLogo } from '../components/CompetitionLogo';
import { PageHeader } from '../components/PageHeader';
import { TeamLogo } from '../components/TeamLogo';
import { Loading } from '../components/ui';
import { useDashboard } from '../hooks/useDashboard';
import { api } from '../lib/api';
import { EVENT_META, EVENT_TYPE_ORDER } from '../lib/format';
import { LANGUAGE_NAMES, useLanguage, useT } from '../lib/i18n';
import { leagueColor } from '../lib/league-themes';
import { hapticSelect } from '../lib/telegram';
import type { CompetitionOption, EventType, FavoriteTeam, Language, Preferences, TeamOption } from '../types';
import { Icon } from '../components/Icon';

const MAX_FAVORITE_TEAMS = 30;
const LANGUAGE_OPTIONS: readonly Language[] = ['he', 'en'];

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Card({ title, subtitle, children }: { readonly title: string; readonly subtitle?: string; readonly children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-bg-card p-4">
      <div>
        <h2 className="text-sm font-bold">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function TeamSearch({ favorites, onAdd }: { readonly favorites: FavoriteTeam[]; readonly onAdd: (team: FavoriteTeam) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TeamOption[]>([]);
  const [searching, setSearching] = useState(false);
  const requestId = useRef(0);
  const t = useT();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const id = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const found = await api.searchTeams(q);
        if (id === requestId.current) setResults(found);
      } catch {
        if (id === requestId.current) setResults([]);
      } finally {
        if (id === requestId.current) setSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const favoriteIds = new Set(favorites.map((f) => f.id));
  return (
    <div className="flex flex-col gap-2">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.settings.searchPlaceholder}
        className="w-full rounded-lg border border-border-subtle bg-bg-elevated px-3 py-2 text-sm outline-none placeholder:text-text-muted focus:border-accent-brand"
      />
      {searching && <p className="text-xs text-text-muted">{t.settings.searching}</p>}
      {results.length > 0 && (
        <ul className="flex max-h-64 flex-col overflow-y-auto rounded-lg border border-border-subtle">
          {results.map((team) => {
            const added = favoriteIds.has(team.id);
            return (
              <li key={team.id}>
                <button
                  disabled={added || favorites.length >= MAX_FAVORITE_TEAMS}
                  onClick={() => {
                    onAdd({ id: team.id, name: team.name });
                    setQuery('');
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-start text-sm hover:bg-bg-elevated disabled:opacity-50"
                >
                  <TeamLogo teamId={team.id} name={team.name} size={20} />
                  <span className="flex-1 truncate">{team.name}</span>
                  <span className="text-xs text-accent-brand">{added ? t.settings.added : t.settings.add}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function SettingsPage() {
  const { refresh } = useDashboard();
  const { language, setLanguage } = useLanguage();
  const t = useT();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, c] = await Promise.all([api.preferences(), api.competitions()]);
        setPrefs(p);
        setCompetitions(c);
      } catch {
        setError(true);
      }
    })();
  }, []);

  const update = (next: Preferences) => {
    hapticSelect();
    setPrefs(next);
    setDirty(true);
    setSaved(false);
  };

  const save = async () => {
    if (!prefs) return;
    setSaving(true);
    setError(false);
    try {
      const next = await api.savePreferences(prefs);
      setPrefs(next);
      setDirty(false);
      setSaved(true);
      // A language change remounts the app, which refetches everything in the new language.
      if (next.language && next.language !== language) setLanguage(next.language);
      else refresh();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-40 md:pb-28">
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} maxWidth="max-w-2xl" />

      {error && <p className="mx-auto mt-4 max-w-2xl px-4 text-sm text-accent-red">{t.settings.error}</p>}
      {!prefs && !error && <Loading />}

      {prefs && (
        <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pt-4">
          <Card title={t.settings.language} subtitle={t.settings.languageSubtitle}>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGE_OPTIONS.map((lang) => {
                const on = (prefs.language ?? language) === lang;
                return (
                  <button
                    key={lang}
                    lang={lang}
                    onClick={() => update({ ...prefs, language: lang })}
                    aria-pressed={on}
                    className={`rounded-lg border py-2 text-sm font-semibold transition ${on ? 'border-accent-brand bg-accent-brand/10 text-text-primary' : 'border-border-subtle text-text-muted'}`}
                  >
                    {LANGUAGE_NAMES[lang]}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title={t.settings.leagues} subtitle={t.settings.leaguesSubtitle}>
            <div className="flex flex-wrap gap-2">
              {competitions.map((c) => {
                const on = prefs.competitionIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => update({ ...prefs, competitionIds: toggle(prefs.competitionIds, c.id) })}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${on ? 'border-transparent text-white' : 'border-border-subtle text-text-secondary'}`}
                    style={on ? { backgroundColor: leagueColor(c.id) } : undefined}
                  >
                    <span className={`flex rounded-full ${on ? 'bg-bg-base/70 p-0.5' : ''}`}>
                      <CompetitionLogo competitionId={c.id} size={on ? 14 : 16} />
                    </span>
                    {c.name}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title={t.settings.myTeams} subtitle={t.settings.myTeamsSubtitle}>
            <TeamSearch favorites={prefs.favoriteTeams} onAdd={(team) => update({ ...prefs, favoriteTeams: [...prefs.favoriteTeams, team] })} />
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-text-secondary">{t.settings.favoritesTitle}</span>
              <span className="score-font text-text-muted">
                {prefs.favoriteTeams.length}/{MAX_FAVORITE_TEAMS}
              </span>
            </div>
            {prefs.favoriteTeams.length === 0 ? (
              <p className="flex items-center gap-2 rounded-lg border border-dashed border-border-subtle px-3 py-3 text-xs text-text-muted">
                <Icon name="star" size={14} />
                {t.settings.noFavorites}
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border-subtle overflow-hidden rounded-lg border border-border-subtle">
                {prefs.favoriteTeams.map((team) => (
                  <li key={team.id} className="flex items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-sm">
                      <TeamLogo teamId={team.id} name={team.name} size={22} />
                      <span className="truncate">{team.name}</span>
                    </div>
                    <button
                      onClick={() => update({ ...prefs, favoriteTeams: prefs.favoriteTeams.filter((f) => f.id !== team.id) })}
                      aria-label={t.settings.remove(team.name)}
                      title={t.settings.remove(team.name)}
                      className="flex size-10 shrink-0 items-center justify-center text-text-muted transition hover:text-accent-red"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t.settings.notifications} subtitle={t.settings.notificationsSubtitle}>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPE_ORDER.map((type: EventType) => {
                const on = prefs.eventTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => update({ ...prefs, eventTypes: toggle(prefs.eventTypes, type) })}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${on ? 'border-accent-brand bg-accent-brand/10 text-text-primary' : 'border-border-subtle text-text-muted'}`}
                  >
                    <Icon name={EVENT_META[type].icon} size={16} />
                    <span className="flex-1 text-start">{t.events[type].label}</span>
                    <span className={`size-4 rounded border ${on ? 'border-accent-brand bg-accent-brand' : 'border-text-muted'}`} />
                  </button>
                );
              })}
            </div>
          </Card>
        </main>
      )}

      {prefs && (
        <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-20 border-t border-border-subtle bg-bg-base/95 p-3 backdrop-blur-md md:bottom-0">
          <div className="mx-auto max-w-2xl">
            <button
              onClick={save}
              disabled={!dirty || saving || prefs.competitionIds.length + prefs.favoriteTeams.length === 0}
              className="w-full rounded-xl bg-accent-brand py-3 text-sm font-bold transition disabled:opacity-40"
            >
              {saving ? t.settings.saving : saved && !dirty ? `${t.settings.saved} ✓` : t.settings.save}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

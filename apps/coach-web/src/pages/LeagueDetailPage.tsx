import { useEffect, useMemo, useState } from 'react';
import { useRoute } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import type { CompetitionDetailResponse } from '../types';
import { LeagueTable } from '../components/LeagueTable';
import { BracketView } from '../components/BracketView';
import { MatchCard } from '../components/MatchCard';
import { EmptyState } from '../components/EmptyState';
import { BackHeader } from '../components/BackHeader';
import { showBackButton } from '../lib/telegram';

type Tab = 'table' | 'bracket' | 'fixtures';

const TAB_LABELS: Record<Tab, string> = { table: 'טבלה', bracket: 'נוקאאוט', fixtures: 'מחזור' };

export function LeagueDetailPage() {
  const [, params] = useRoute('/league/:id');
  const [data, setData] = useState<CompetitionDetailResponse | null>(null);
  const [tab, setTab] = useState<Tab>('table');
  const [error, setError] = useState<string | null>(null);
  const id = Number(params?.id);

  const goBack = () => window.history.back();

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    api.competition(id).then(setData).catch((e) => setError(String(e)));
  }, [id]);

  useEffect(() => showBackButton(goBack), []);

  const tabs = useMemo<Tab[]>(() => {
    if (!data) return ['table', 'fixtures'];
    const list: Tab[] = [];
    if (data.tables.length > 0) list.push('table');
    if (data.knockoutStages.length > 0) list.push('bracket');
    list.push('fixtures');
    return list;
  }, [data]);

  useEffect(() => {
    if (data && !tabs.includes(tab)) setTab(tabs[0] ?? 'fixtures');
  }, [data, tabs, tab]);

  return (
    <div className="min-h-full bg-bg-base">
      <BackHeader
        onBack={goBack}
        title={
          data && (
            <>
              <span className="text-xl">{data.competition.icon}</span>
              <span className="text-text-primary font-bold truncate">{data.competition.name}</span>
            </>
          )
        }
      />

      {error && <EmptyState title="לא הצלחתי לטעון" hint={error} />}
      {!error && !data && <EmptyState title="טוען..." />}

      {data && (
        <>
          {tabs.length > 1 && (
            <div className="px-4 pt-3">
              <div className="inline-flex rounded-full bg-bg-card border border-border-subtle p-1">
                {tabs.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${tab === t ? 'bg-accent-win text-bg-base font-semibold' : 'text-text-secondary'}`}
                  >
                    {TAB_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <main className="p-4">
            <AnimatePresence mode="wait">
              {tab === 'table' && (
                <motion.div key="table" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-3">
                  {data.tables.length === 0 ? (
                    <EmptyState title="אין טבלה זמינה" />
                  ) : (
                    data.tables.map((t, idx) => (
                      <section key={t.groupName ?? `g-${idx}`} className="space-y-1.5">
                        {t.groupName && <h3 className="text-sm font-semibold text-text-primary px-1">{t.groupName}</h3>}
                        <LeagueTable rows={t.rows} />
                      </section>
                    ))
                  )}
                </motion.div>
              )}
              {tab === 'bracket' && (
                <motion.div key="bracket" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                  {data.knockoutStages.length === 0 ? <EmptyState title="אין שלב נוקאאוט" /> : <BracketView stages={data.knockoutStages} competitionName={data.competition.name} />}
                </motion.div>
              )}
              {tab === 'fixtures' && (
                <motion.div key="fixtures" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-2">
                  {data.fixtures.length === 0 ? <EmptyState title="אין משחקים" /> : data.fixtures.map((m) => <MatchCard key={m.id} match={m} showDate />)}
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </>
      )}
    </div>
  );
}

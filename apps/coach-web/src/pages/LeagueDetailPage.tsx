import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import type { CompetitionDetailResponse } from '../types';
import { LeagueTable } from '../components/LeagueTable';
import { MatchCard } from '../components/MatchCard';
import { EmptyState } from '../components/EmptyState';
import { BackHeader } from '../components/BackHeader';
import { showBackButton } from '../lib/telegram';

type Tab = 'table' | 'fixtures';

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
          <div className="px-4 pt-3">
            <div className="inline-flex rounded-full bg-bg-card border border-border-subtle p-1">
              {(['table', 'fixtures'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${tab === t ? 'bg-accent-win text-bg-base font-semibold' : 'text-text-secondary'}`}
                >
                  {t === 'table' ? 'טבלה' : 'מחזור'}
                </button>
              ))}
            </div>
          </div>

          <main className="p-4">
            <AnimatePresence mode="wait">
              {tab === 'table' ? (
                <motion.div key="table" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                  {data.table.length === 0 ? <EmptyState title="אין טבלה זמינה" /> : <LeagueTable rows={data.table} />}
                </motion.div>
              ) : (
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

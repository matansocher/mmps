import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { api } from '../lib/api';
import type { MeResponse } from '../types';
import { SessionSummary } from '../components/SessionSummary';

export function SummaryPage() {
  const [, navigate] = useLocation();
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    api.me().then(setMe);
  }, []);

  if (!me) return <div className="p-6 text-gray-400">Loading…</div>;

  return (
    <SessionSummary
      xpEarned={0}
      totalXp={me.user.xp}
      streakCount={me.user.streakCount}
      heartsRemaining={me.user.heartsRemaining}
      heartsMax={me.user.heartsMax}
      onPlayAgain={() => navigate('/')}
    />
  );
}

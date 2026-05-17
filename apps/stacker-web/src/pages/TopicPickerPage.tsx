import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { api } from '../lib/api';
import type { MeResponse, TopicsResponse, Topic, Level } from '../types';
import { TopicCard } from '../components/TopicCard';
import { HeartsIndicator } from '../components/HeartsIndicator';
import { hapticLight } from '../lib/telegram';

export function TopicPickerPage() {
  const [, navigate] = useLocation();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [topics, setTopics] = useState<TopicsResponse | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.me(), api.topics()])
      .then(([m, t]) => {
        setMe(m);
        setTopics(t);
        if (m.activeSession) navigate('/round');
      })
      .catch((e: Error) => setError(e.message));
  }, [navigate]);

  async function start(topic: Topic, level: Level) {
    if (starting) return;
    hapticLight();
    setStarting(true);
    setError(null);
    try {
      const res = await api.startSession(topic, level);
      if (!res.ok) {
        if (res.reason === 'out_of_hearts') navigate('/out-of-hearts');
        else setError('No questions available for that combo.');
        setStarting(false);
        return;
      }
      navigate('/round');
    } catch (e) {
      setError((e as Error).message);
      setStarting(false);
    }
  }

  if (error) return <div className="p-6 text-red-400">{error}</div>;
  if (!me || !topics) return <div className="p-6 text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-gray-400">XP</div>
          <div className="text-white font-semibold">{me.user.xp}</div>
        </div>
        <HeartsIndicator remaining={me.user.heartsRemaining} max={me.user.heartsMax} />
        <div className="text-right">
          <div className="text-xs text-gray-400">🔥 Streak</div>
          <div className="text-white font-semibold">{me.user.streakCount}</div>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-white mb-4">Pick a topic</h1>
      <div className="space-y-3">
        {topics.topics.map((t) => (
          <TopicCard key={t.topic} topic={t.topic} label={t.label} levels={t.levels} onPick={start} />
        ))}
      </div>
    </div>
  );
}

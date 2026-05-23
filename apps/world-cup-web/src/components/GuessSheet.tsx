import { useEffect, useState } from 'react';
import type { MatchDto } from '../lib/types';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';
import { BottomSheet } from './BottomSheet';

type Props = {
  match: MatchDto | null;
  onClose: () => void;
  onSubmitted: () => void;
};

export function GuessSheet({ match, onClose, onSubmitted }: Props) {
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (match?.myGuess) {
      setHomeScore(match.myGuess.home.toString());
      setAwayScore(match.myGuess.away.toString());
    } else {
      setHomeScore('');
      setAwayScore('');
    }
    setError('');
  }, [match?.id]);

  async function handleSubmit() {
    if (!match) return;
    const h = parseInt(homeScore, 10);
    const a = parseInt(awayScore, 10);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setError('הזינו תוצאה תקינה');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.submitGuess(match.id, h, a);
      haptic('success');
      onSubmitted();
      onClose();
    } catch {
      setError('שגיאה בשליחה');
      haptic('error');
    } finally {
      setSubmitting(false);
    }
  }

  const time = match ? new Date(match.startTime).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', timeStyle: 'short' }) : '';

  return (
    <BottomSheet open={!!match} onClose={onClose} label="שליחת ניחוש">
      {match && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-lg font-bold">
              {match.home.flag} {match.home.name} נגד {match.away.name} {match.away.flag}
            </div>
            <div className="text-text-muted text-sm mt-1">{time}</div>
          </div>

          <div className="flex items-center justify-center gap-4" dir="ltr">
            <div className="text-center">
              <div className="text-xs text-text-muted mb-1">{match.home.name}</div>
              <input
                type="number"
                min="0"
                max="20"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="w-16 h-12 bg-bg-elevated border border-border-subtle rounded-lg text-center score-font text-xl"
                placeholder="0"
              />
            </div>
            <span className="text-text-muted text-xl mt-5">-</span>
            <div className="text-center">
              <div className="text-xs text-text-muted mb-1">{match.away.name}</div>
              <input
                type="number"
                min="0"
                max="20"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="w-16 h-12 bg-bg-elevated border border-border-subtle rounded-lg text-center score-font text-xl"
                placeholder="0"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-accent-exact text-white font-medium py-3 rounded-xl hover:bg-accent-exact/90 transition disabled:opacity-50"
          >
            {submitting ? 'שומר...' : match.myGuess ? 'עדכון ניחוש' : 'שליחת ניחוש'}
          </button>

          {error && <p className="text-accent-wrong text-sm text-center">{error}</p>}
        </div>
      )}
    </BottomSheet>
  );
}

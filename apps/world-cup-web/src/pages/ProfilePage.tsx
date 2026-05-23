import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { ProfileDto, UserStatsDto } from '../lib/types';
import { BottomNav } from '../components/BottomNav';

export function ProfilePage() {
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);

  useEffect(() => {
    api.profile().then((p) => {
      setProfile(p);
      setNameInput(p.displayName ?? p.firstName);
    }).catch(() => setProfile(null)).finally(() => setLoading(false));
  }, []);

  async function toggleNotifications() {
    if (!profile) return;
    const newVal = !profile.notificationsEnabled;
    await api.setNotifications(newVal);
    setProfile({ ...profile, notificationsEnabled: newVal });
  }

  async function saveDisplayName() {
    if (!profile || !nameInput.trim() || nameInput.trim() === (profile.displayName ?? profile.firstName)) return;
    setNameSaving(true);
    try {
      const res = await api.setDisplayName(nameInput.trim());
      setProfile({ ...profile, displayName: res.displayName });
    } catch { /* ignore */ }
    setNameSaving(false);
  }

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-10 bg-bg-base/90 backdrop-blur px-4 py-3 border-b border-border-subtle">
        <h1 className="text-lg font-bold">👤 פרופיל</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-3">
        {loading && <p className="text-text-muted text-center py-8">טוען...</p>}
        {!loading && !profile && <p className="text-text-muted text-center py-8">שלחו /start בבוט כדי ליצור פרופיל.</p>}
        {!loading && profile && (
          <div className="space-y-4">
            {/* Stats Dashboard */}
            {profile.stats && profile.stats.exactCount + profile.stats.gdCount + profile.stats.resultCount + profile.stats.wrongCount > 0 && (
              <StatsSection stats={profile.stats} />
            )}

            <div className="bg-bg-card rounded-xl p-4 border border-border-subtle">
              <h2 className="text-sm text-text-secondary mb-3">שם תצוגה (בטבלת הדירוג)</h2>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={30}
                  className="flex-1 bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-exact"
                  dir="auto"
                />
                <button
                  onClick={saveDisplayName}
                  disabled={nameSaving || !nameInput.trim() || nameInput.trim() === (profile.displayName ?? profile.firstName)}
                  className="px-3 py-2 text-sm bg-accent-exact text-white rounded-lg disabled:opacity-40"
                >
                  {nameSaving ? '...' : 'שמור'}
                </button>
              </div>
            </div>

            <div className="bg-bg-card rounded-xl p-4 border border-border-subtle">
              <h2 className="text-sm text-text-secondary mb-3">הגדרות</h2>
              <div className="flex items-center justify-between">
                <span className="text-sm">תזכורות משחקים</span>
                <button
                  onClick={toggleNotifications}
                  className={`w-12 h-6 rounded-full transition-colors ${profile.notificationsEnabled ? 'bg-accent-exact' : 'bg-bg-elevated'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${profile.notificationsEnabled ? '-translate-x-6' : '-translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            <div className="bg-bg-card rounded-xl p-4 border border-border-subtle">
              <h2 className="text-sm text-text-secondary mb-3">שיטת ניקוד</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>🎯 תוצאה מדויקת</span><span className="text-accent-exact font-bold">5 נק׳</span></div>
                <div className="flex justify-between"><span>✅ תוצאה + הפרש</span><span className="text-accent-gd font-bold">3 נק׳</span></div>
                <div className="flex justify-between"><span>👍 תוצאה נכונה</span><span className="text-accent-result font-bold">1 נק׳</span></div>
                <div className="flex justify-between"><span>❌ שגוי</span><span className="text-accent-wrong font-bold">0 נק׳</span></div>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function StatsSection({ stats }: { stats: UserStatsDto }) {
  const total = stats.exactCount + stats.gdCount + stats.resultCount + stats.wrongCount;

  return (
    <div className="space-y-3">
      {/* Accuracy + Streak */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-bg-card rounded-xl p-4 border border-border-subtle text-center">
          <div className="text-3xl font-bold text-accent-exact">{stats.accuracy}%</div>
          <div className="text-xs text-text-secondary mt-1">דיוק כללי</div>
        </div>
        <div className="bg-bg-card rounded-xl p-4 border border-border-subtle text-center">
          <div className="text-3xl font-bold text-orange-400">🔥 {stats.currentStreak}</div>
          <div className="text-xs text-text-secondary mt-1">רצף נוכחי</div>
          {stats.bestStreak > stats.currentStreak && (
            <div className="text-[10px] text-text-muted mt-0.5">שיא: {stats.bestStreak}</div>
          )}
        </div>
      </div>

      {/* Point Distribution Bar */}
      <div className="bg-bg-card rounded-xl p-4 border border-border-subtle">
        <h3 className="text-xs text-text-secondary mb-3">📊 התפלגות ניקוד</h3>
        <div className="flex h-5 rounded-full overflow-hidden mb-2">
          {stats.exactCount > 0 && (
            <div className="bg-accent-exact flex items-center justify-center" style={{ width: `${(stats.exactCount / total) * 100}%` }}>
              {stats.exactCount > 1 && <span className="text-[9px] text-black font-bold">{stats.exactCount}</span>}
            </div>
          )}
          {stats.gdCount > 0 && (
            <div className="bg-accent-gd flex items-center justify-center" style={{ width: `${(stats.gdCount / total) * 100}%` }}>
              {stats.gdCount > 1 && <span className="text-[9px] text-black font-bold">{stats.gdCount}</span>}
            </div>
          )}
          {stats.resultCount > 0 && (
            <div className="bg-accent-result flex items-center justify-center" style={{ width: `${(stats.resultCount / total) * 100}%` }}>
              {stats.resultCount > 1 && <span className="text-[9px] text-black font-bold">{stats.resultCount}</span>}
            </div>
          )}
          {stats.wrongCount > 0 && (
            <div className="bg-accent-wrong flex items-center justify-center" style={{ width: `${(stats.wrongCount / total) * 100}%` }}>
              {stats.wrongCount > 1 && <span className="text-[9px] text-white font-bold">{stats.wrongCount}</span>}
            </div>
          )}
        </div>
        <div className="flex justify-between text-[10px] text-text-muted">
          <span>🎯 {stats.exactCount}</span>
          <span>✅ {stats.gdCount}</span>
          <span>👍 {stats.resultCount}</span>
          <span>❌ {stats.wrongCount}</span>
        </div>
      </div>

      {/* Best/Worst Team */}
      {(stats.bestTeam || stats.worstTeam) && (
        <div className="grid grid-cols-2 gap-3">
          {stats.bestTeam && (
            <div className="bg-bg-card rounded-xl p-3 border border-border-subtle text-center">
              <div className="text-lg">{stats.bestTeam.flag}</div>
              <div className="text-xs font-medium mt-1">{stats.bestTeam.name}</div>
              <div className="text-[10px] text-green-400 mt-0.5">{stats.bestTeam.accuracy}% דיוק</div>
              <div className="text-[10px] text-text-muted">הכי טוב</div>
            </div>
          )}
          {stats.worstTeam && (
            <div className="bg-bg-card rounded-xl p-3 border border-border-subtle text-center">
              <div className="text-lg">{stats.worstTeam.flag}</div>
              <div className="text-xs font-medium mt-1">{stats.worstTeam.name}</div>
              <div className="text-[10px] text-red-400 mt-0.5">{stats.worstTeam.accuracy}% דיוק</div>
              <div className="text-[10px] text-text-muted">הכי פחות טוב</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

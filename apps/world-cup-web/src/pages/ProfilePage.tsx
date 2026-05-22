import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { ProfileDto } from '../lib/types';
import { BottomNav } from '../components/BottomNav';

export function ProfilePage() {
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.profile().then(setProfile).catch(() => setProfile(null)).finally(() => setLoading(false));
  }, []);

  async function toggleNotifications() {
    if (!profile) return;
    const newVal = !profile.notificationsEnabled;
    await api.setNotifications(newVal);
    setProfile({ ...profile, notificationsEnabled: newVal });
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

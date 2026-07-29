import { useCallback, useEffect, useState } from 'react';
import { api } from './lib/api';
import { CareerScreen } from './screens/CareerScreen';
import { LoginScreen } from './screens/LoginScreen';
import { PickClubScreen } from './screens/PickClubScreen';
import type { Career, SessionUser } from './types';

type Status = 'loading' | 'signed-out' | 'no-career' | 'in-career';

export function App() {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [career, setCareer] = useState<Career | null>(null);

  const refresh = useCallback(async () => {
    try {
      const me = await api.me();
      setStatus(me.hasCareer ? 'in-career' : 'no-career');
      setCareer(me.career);
    } catch {
      setStatus('signed-out');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function logout() {
    await api.logout().catch(() => undefined);
    setUser(null);
    setCareer(null);
    setStatus('signed-out');
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9.5" stroke="var(--accent)" strokeWidth="1.6" />
            <path d="M12 6.5l3.5 2.6-1.35 4.1h-4.3L8.5 9.1 12 6.5z" fill="var(--accent)" />
            <path d="M12 6.5V3.2M8.5 9.1L5.4 7.9M15.5 9.1l3.1-1.2M9.85 13.2l-2 2.7M14.15 13.2l2 2.7" stroke="var(--electric)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Football Manager Lite
        </span>
        <span className="grow" />
        {status !== 'signed-out' && status !== 'loading' && (
          <div className="user">
            {user?.avatarUrl && <img src={user.avatarUrl} alt="" />}
            {user && <span>{user.displayName}</span>}
            <button className="ghost" onClick={logout}>
              Sign out
            </button>
          </div>
        )}
      </header>

      {status === 'loading' && (
        <div className="center-screen">
          <p className="muted">Loading…</p>
        </div>
      )}

      {status === 'signed-out' && (
        <LoginScreen
          onSignedIn={(u) => {
            setUser(u);
            void refresh();
          }}
        />
      )}

      {status === 'no-career' && <PickClubScreen onCareerCreated={() => void refresh()} />}

      {status === 'in-career' && career && <CareerScreen career={career} onCareerChanged={() => void refresh()} />}
    </div>
  );
}

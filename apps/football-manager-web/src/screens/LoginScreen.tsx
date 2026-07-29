import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { AuthConfig, SessionUser } from '../types';

type Props = {
  readonly onSignedIn: (user: SessionUser) => void;
};

// Loads the Google Identity Services script once and returns whether it's ready.
function useGoogleScript(enabled: boolean): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    if (document.getElementById('gsi-script')) {
      setReady(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, [enabled]);
  return ready;
}

type GoogleIdentity = {
  readonly accounts: {
    readonly id: {
      initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
};

export function LoginScreen({ onSignedIn }: Props) {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const googleReady = useGoogleScript(Boolean(config?.googleEnabled && config.clientId));

  useEffect(() => {
    api
      .authConfig()
      .then(setConfig)
      .catch(() => setError('Could not load sign-in options'));
  }, []);

  // Render the Google button once the script + config are available.
  useEffect(() => {
    if (!googleReady || !config?.clientId || !googleBtnRef.current) return;
    const google = (window as unknown as { google?: GoogleIdentity }).google;
    if (!google) return;
    google.accounts.id.initialize({
      client_id: config.clientId,
      callback: async (response: { credential: string }) => {
        try {
          setBusy(true);
          const { user } = await api.loginGoogle(response.credential);
          onSignedIn(user);
        } catch {
          setError('Google sign-in failed');
          setBusy(false);
        }
      },
    });
    google.accounts.id.renderButton(googleBtnRef.current, { theme: 'filled_black', size: 'large', width: 320 });
  }, [googleReady, config, onSignedIn]);

  async function devLogin() {
    try {
      setBusy(true);
      setError(null);
      const { user } = await api.loginDev(name || 'Dev Manager');
      onSignedIn(user);
    } catch {
      setError('Dev sign-in failed');
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="card login">
        <div className="crest" aria-hidden="true">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9.5" stroke="var(--accent)" strokeWidth="1.4" />
            <path d="M12 6.5l3.5 2.6-1.35 4.1h-4.3L8.5 9.1 12 6.5z" fill="var(--accent)" />
            <path d="M12 6.5V3.2M8.5 9.1L5.4 7.9M15.5 9.1l3.1-1.2M9.85 13.2l-2 2.7M14.15 13.2l2 2.7" stroke="var(--electric)" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </div>
        <h1>Football Manager Lite</h1>
        <p className="tagline">Take charge of a top-5 European league club and build a dynasty.</p>

        {config?.googleEnabled && <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }} />}

        {config?.devLoginEnabled && (
          <div>
            {config.googleEnabled && <div className="divider">or</div>}
            <input type="text" placeholder="Manager name" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', marginBottom: 10 }} />
            <button className="primary" onClick={devLogin} disabled={busy}>
              {busy ? 'Signing in…' : 'Enter as manager'}
            </button>
          </div>
        )}

        {!config && !error && <p className="muted">Loading…</p>}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}

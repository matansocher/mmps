import { useEffect, useRef, useState } from 'react';

type InstallPrompt = Event & {
  readonly prompt: () => Promise<void>;
  readonly userChoice: Promise<{ readonly outcome: 'accepted' | 'dismissed' }>;
};

export function useOffline() {
  const [ready, setReady] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [error, setError] = useState('');
  const reload = useRef(false);
  useEffect(() => {
    if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
    let live = true;
    let registration: ServiceWorkerRegistration | undefined;
    const changed = () => {
      if (reload.current) window.location.reload();
      else setReady(!!navigator.serviceWorker.controller);
    };
    const installed = () => {
      if (live && registration?.waiting) setWaiting(registration.waiting);
    };
    const found = () => registration?.installing?.addEventListener('statechange', installed);
    const offerInstall = (event: Event) => {
      if (!('prompt' in event) || !('userChoice' in event)) return;
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const appInstalled = () => setPrompt(null);
    async function register() {
      try {
        registration = await navigator.serviceWorker.register('/rewind/sw.js', { scope: '/rewind/', updateViaCache: 'none' });
        if (!live) return;
        setReady(!!navigator.serviceWorker.controller);
        installed();
        found();
        registration.addEventListener('updatefound', found);
      } catch (cause) {
        console.warn('Rewind offline setup failed.', cause);
        if (live) setError('Offline play could not be prepared. Reopen the game while connected to try again.');
      }
    }
    void register();
    navigator.serviceWorker.addEventListener('controllerchange', changed);
    window.addEventListener('beforeinstallprompt', offerInstall);
    window.addEventListener('appinstalled', appInstalled);
    return () => {
      live = false;
      registration?.removeEventListener('updatefound', found);
      navigator.serviceWorker.removeEventListener('controllerchange', changed);
      window.removeEventListener('beforeinstallprompt', offerInstall);
      window.removeEventListener('appinstalled', appInstalled);
    };
  }, []);
  async function install() {
    if (!prompt) return;
    try {
      await prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
    } catch (cause) {
      console.warn('Rewind could not show installation.', cause);
      setError('Installation could not start. Use your browser’s Add to Home Screen option instead.');
    }
  }
  function update() {
    reload.current = true;
    waiting?.postMessage('ACTIVATE_UPDATE');
  }
  return { ready, waiting, prompt, error, install, update };
}

export function OfflineSettings({ offline }: { readonly offline: ReturnType<typeof useOffline> }) {
  return (
    <section className="offline-settings">
      <h3>Take the path with you</h3>
      <p>
        {import.meta.env.DEV
          ? 'Offline installation is available in the published game.'
          : offline.ready
            ? 'Every room in this campaign is ready to play offline. Cloud saves catch up when you reconnect.'
            : 'Keep this page open while connected to prepare the rooms for offline play.'}
      </p>
      <p className="supporting">
        Add Rewind to your home screen from your browser’s menu. On iPhone, use Safari → Share → Add to Home Screen. Open through Telegram to sync between devices; a standalone browser visit stays
        local.
      </p>
      {offline.prompt && (
        <button
          onClick={() => {
            void offline.install();
          }}
        >
          Install Rewind
        </button>
      )}
      {offline.waiting && <button onClick={offline.update}>Update game and reopen</button>}
      {offline.error && <p role="status">{offline.error}</p>}
    </section>
  );
}

import { useEffect, useState } from 'react';
import { track } from '../lib/analytics';
import { hasRemoteIdentity, request } from '../lib/api';
import { readJson, writeJson } from '../lib/progress';
import { telegram } from '../lib/telegram';

type Reminder = { readonly enabled: boolean; readonly time: string; readonly timezone: string };
export function ReminderPrompt({ settings = false }: { readonly settings?: boolean }) {
  const [reminder, setReminder] = useState<Reminder>({ enabled: false, time: '19:00', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [dismissed, setDismissed] = useState(() => readJson('mindloop:reminder-dismissed', false));
  useEffect(() => {
    if (hasRemoteIdentity())
      void (async () => {
        try {
          const data = await request<{ reminder: Reminder | null; available: boolean }>('/api/mindloop/player/reminder');
          setAvailable(data.available);
          if (data.reminder) setReminder(data.reminder);
        } catch {
          setMessage('Reminders are unavailable right now.');
        }
      })();
  }, []);
  const save = async (enabled: boolean) => {
    setBusy(true);
    setMessage('');
    try {
      if (enabled) {
        const tg = telegram();
        if (!tg?.requestWriteAccess) {
          setMessage('Open Mindloop from its Telegram mini-app button to enable reminders.');
          return;
        }
        const allowed = await new Promise<boolean>((resolve) => tg.requestWriteAccess!(resolve));
        if (!allowed) {
          setMessage('No reminder enabled. You can choose this later.');
          return;
        }
      }
      const next = { ...reminder, enabled };
      await request('/api/mindloop/player/reminder', { method: 'PUT', body: JSON.stringify(next) });
      setReminder(next);
      track(enabled ? 'reminder_opt_in' : 'reminder_opt_out');
      setMessage(enabled ? 'Your reminder is on. Completed loops won’t get a reminder.' : 'Reminders are off.');
    } catch {
      setMessage('Couldn’t save your reminder. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  if (!settings && (dismissed || reminder.enabled || !available)) return null;
  return (
    <section className="ml-reminder">
      <h2>A little nudge, on your terms</h2>
      <p>One Telegram reminder at your chosen time. Skip it any day; your keepsakes stay yours.</p>
      {!available ? (
        <p>{message || 'Reminders become available when you open the configured Telegram mini-app.'}</p>
      ) : (
        <>
          <div className="ml-reminder-fields">
            <label>
              Time
              <input type="time" value={reminder.time} onChange={(e) => setReminder({ ...reminder, time: e.target.value })} />
            </label>
            <label>
              Time zone
              <input value={reminder.timezone} onChange={(e) => setReminder({ ...reminder, timezone: e.target.value })} />
            </label>
          </div>
          <button className="ml-primary" disabled={busy} onClick={() => void save(true)}>
            {busy ? 'Saving…' : reminder.enabled ? 'Update reminder' : 'Remind me'}
          </button>
          {reminder.enabled && (
            <button className="ml-text-button" disabled={busy} onClick={() => void save(false)}>
              Turn reminders off
            </button>
          )}
        </>
      )}
      {!settings && (
        <button
          className="ml-text-button"
          onClick={() => {
            writeJson('mindloop:reminder-dismissed', true);
            setDismissed(true);
          }}
        >
          Maybe later
        </button>
      )}
      <p role="status">{message}</p>
    </section>
  );
}

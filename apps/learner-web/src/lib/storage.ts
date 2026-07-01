import { getWebApp } from './telegram';

// Persisted shape: { [courseId]: string[] }  (read lesson ids per course)
export type ReadMap = Record<string, string[]>;

const KEY = 'courses_read_v1';
const CLOUD_TIMEOUT_MS = 1200;

// CloudStorage requires Bot API 6.9+. Older/emulated clients expose the object
// but log "not supported" warnings when used, so gate on the version.
function cloudStorage() {
  const w = getWebApp();
  if (!w?.CloudStorage) return null;
  if (!w.isVersionAtLeast?.('6.9')) return null;
  return w.CloudStorage;
}

function readLocal(): ReadMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ReadMap) : {};
  } catch {
    return {};
  }
}

function writeLocal(map: ReadMap): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

// Load from Telegram CloudStorage when available, falling back to localStorage.
// CloudStorage callbacks can silently hang outside a real Telegram client, so we
// race them against a short timeout.
export function loadReadMap(): Promise<ReadMap> {
  const cs = cloudStorage();
  if (!cs) return Promise.resolve(readLocal());

  return new Promise((resolve) => {
    let settled = false;
    const finish = (map: ReadMap) => {
      if (settled) return;
      settled = true;
      resolve(map);
    };
    const timer = setTimeout(() => finish(readLocal()), CLOUD_TIMEOUT_MS);
    try {
      cs.getItem(KEY, (err, value) => {
        clearTimeout(timer);
        if (err || !value) return finish(readLocal());
        try {
          finish(JSON.parse(value) as ReadMap);
        } catch {
          finish(readLocal());
        }
      });
    } catch {
      clearTimeout(timer);
      finish(readLocal());
    }
  });
}

// Write-through: localStorage is always the source of truth locally; CloudStorage
// is best-effort mirrored so progress survives across devices.
export function saveReadMap(map: ReadMap): void {
  writeLocal(map);
  const cs = cloudStorage();
  if (!cs) return;
  try {
    cs.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

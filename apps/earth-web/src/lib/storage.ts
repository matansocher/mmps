const PREFIX = 'earth:v1:';

function getStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readJson<T>(key: string, fallback: T, validate: (value: unknown) => value is T, storage?: Storage): T {
  const store = getStorage(storage);
  if (!store) return fallback;
  try {
    const raw = store.getItem(PREFIX + key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown, storage?: Storage): boolean {
  const store = getStorage(storage);
  if (!store) return false;
  try {
    store.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false; // quota exceeded / private mode
  }
}

export const isArray = (value: unknown): value is unknown[] => Array.isArray(value);

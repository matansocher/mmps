import { COURSES } from '../data/courses';
import { getWebApp } from './telegram';

// Persisted shape (in memory): { [courseId]: string[] } — read lesson ids per course.
export type ReadMap = Record<string, string[]>;

// Opt-in diagnostics (append ?debug=1 to the mini-app URL) to inspect CloudStorage
// behaviour on clients where a devtools console isn't easily accessible.
export type CloudDiag = {
  hasWebApp: boolean;
  hasCloudStorage: boolean;
  version: string;
  gatePassed: boolean;
  usedGetItems: boolean;
  lastResult: 'idle' | 'ok' | 'empty' | 'error' | 'timeout';
  lastError: string;
  courseKeysFound: number;
};
export const cloudDiag: CloudDiag = {
  hasWebApp: false,
  hasCloudStorage: false,
  version: '',
  gatePassed: false,
  usedGetItems: false,
  lastResult: 'idle',
  lastError: '',
  courseKeysFound: 0,
};

// One key per course keeps every CloudStorage value tiny (a course's read-list is
// ~a few hundred chars), well under the 4096-char-per-value limit. A single blob
// for all courses overflows once most of the ~255 lessons are read.
const PREFIX = 'courses_read_v1:';
// Telegram Desktop's CloudStorage callbacks can take several seconds; give it a
// generous ceiling so slow-but-valid responses are not discarded. This only
// bounds a hung promise — it never blocks the initial (local) render.
const CLOUD_TIMEOUT_MS = 10000;
const COURSE_IDS: readonly string[] = COURSES.map((c) => c.id);
const courseKey = (courseId: string) => PREFIX + courseId;

// CloudStorage requires Bot API 6.9+. Older/emulated clients expose the object
// but log "not supported" warnings when used, so gate on the version.
function cloudStorage() {
  const w = getWebApp();
  cloudDiag.hasWebApp = !!w;
  cloudDiag.hasCloudStorage = !!w?.CloudStorage;
  cloudDiag.version = w?.version ?? '';
  if (!w?.CloudStorage) return null;
  const gate = !!w.isVersionAtLeast?.('6.9');
  cloudDiag.gatePassed = gate;
  if (!gate) return null;
  return w.CloudStorage;
}

// ---- localStorage (per-course, always the local source of truth) ----

function writeLocalCourse(courseId: string, lessonIds: string[]): void {
  try {
    if (lessonIds.length) localStorage.setItem(courseKey(courseId), JSON.stringify(lessonIds));
    else localStorage.removeItem(courseKey(courseId));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

function parseIds(raw: string | undefined | null): string[] | null {
  if (!raw) return null;
  try {
    const ids = JSON.parse(raw);
    return Array.isArray(ids) && ids.length ? (ids as string[]) : null;
  } catch {
    return null;
  }
}

// Synchronous read from localStorage — used for the instant initial render.
export function readLocalMap(): ReadMap {
  const map: ReadMap = {};
  for (const id of COURSE_IDS) {
    const ids = parseIds(localStorage.getItem(courseKey(id)));
    if (ids) map[id] = ids;
  }
  return map;
}

// Mirror a cloud map back into localStorage so the offline fallback stays current.
export function mirrorToLocal(map: ReadMap): void {
  for (const id of COURSE_IDS) writeLocalCourse(id, map[id] ?? []);
}

// ---- CloudStorage ----

// Read every course key from CloudStorage. Prefers the batched getItems, falling
// back to parallel getItem calls for desktop builds that only implement the latter.
function cloudGetAll(cs: NonNullable<ReturnType<typeof cloudStorage>>): Promise<Record<string, string>> {
  const keys = COURSE_IDS.map(courseKey);
  if (typeof cs.getItems === 'function') {
    cloudDiag.usedGetItems = true;
    return new Promise((resolve, reject) => {
      cs.getItems(keys, (err, values) => (err ? reject(new Error(err)) : resolve(values ?? {})));
    });
  }
  cloudDiag.usedGetItems = false;
  return Promise.all(
    keys.map(
      (k) =>
        new Promise<[string, string]>((resolve) => {
          cs.getItem(k, (_err, value) => resolve([k, value ?? '']));
        }),
    ),
  ).then((pairs) => Object.fromEntries(pairs));
}

// Fetch the cross-device progress from CloudStorage. Resolves to null when cloud
// is unavailable, errors, or times out — callers must NOT overwrite local state
// on null (that would wipe good local data with nothing). Retries once, since the
// first request on Telegram Desktop right after startup is occasionally dropped.
export function fetchCloudMap(): Promise<ReadMap | null> {
  const cs = cloudStorage();
  if (!cs) return Promise.resolve(null);

  const attempt = (): Promise<ReadMap | null> => {
    const load = cloudGetAll(cs).then((values) => {
      const map: ReadMap = {};
      for (const id of COURSE_IDS) {
        const ids = parseIds(values[courseKey(id)]);
        if (ids) map[id] = ids;
      }
      cloudDiag.courseKeysFound = Object.keys(map).length;
      cloudDiag.lastResult = cloudDiag.courseKeysFound > 0 ? 'ok' : 'empty';
      return map;
    });
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => {
        cloudDiag.lastResult = 'timeout';
        resolve(null);
      }, CLOUD_TIMEOUT_MS),
    );
    return Promise.race([load, timeout]).catch((e) => {
      cloudDiag.lastResult = 'error';
      cloudDiag.lastError = String(e?.message ?? e);
      return null;
    });
  };

  return attempt().then((map) => {
    if (map) return map;
    return new Promise<ReadMap | null>((resolve) => setTimeout(() => resolve(attempt()), 600));
  });
}

// Write-through for a single course: localStorage first (always), CloudStorage
// best-effort mirrored. Touching one key per toggle keeps writes tiny and cheap.
export function saveCourse(courseId: string, lessonIds: string[]): void {
  writeLocalCourse(courseId, lessonIds);
  const cs = cloudStorage();
  if (!cs) return;
  try {
    if (lessonIds.length) cs.setItem(courseKey(courseId), JSON.stringify(lessonIds));
    else cs.removeItem(courseKey(courseId));
  } catch {
    /* ignore */
  }
}

import { COURSES } from '../data/courses';
import { getWebApp } from './telegram';

// Persisted shape (in memory): { [courseId]: string[] } — read lesson ids per course.
export type ReadMap = Record<string, string[]>;

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
  if (!w?.CloudStorage) return null;
  if (!w.isVersionAtLeast?.('6.9')) return null;
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
    return new Promise((resolve, reject) => {
      cs.getItems(keys, (err, values) => (err ? reject(new Error(err)) : resolve(values ?? {})));
    });
  }
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
// on null (that would wipe good local data with nothing).
export function fetchCloudMap(): Promise<ReadMap | null> {
  const cs = cloudStorage();
  if (!cs) return Promise.resolve(null);

  const load = cloudGetAll(cs).then((values) => {
    const map: ReadMap = {};
    for (const id of COURSE_IDS) {
      const ids = parseIds(values[courseKey(id)]);
      if (ids) map[id] = ids;
    }
    return map;
  });

  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), CLOUD_TIMEOUT_MS));
  return Promise.race([load, timeout]).catch(() => null);
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

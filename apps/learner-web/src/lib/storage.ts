import { COURSES } from '../data/courses';
import { getWebApp } from './telegram';

// Persisted shape (in memory): { [courseId]: string[] } — read lesson ids per course.
export type ReadMap = Record<string, string[]>;

// One key per course keeps every CloudStorage value tiny (a course's read-list is
// ~a few hundred chars), well under the 4096-char-per-value limit. A single blob
// for all courses overflows once most of the ~255 lessons are read.
const PREFIX = 'courses_read_v1:';
const CLOUD_TIMEOUT_MS = 1500;
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

function readLocalMap(): ReadMap {
  const map: ReadMap = {};
  for (const id of COURSE_IDS) {
    try {
      const raw = localStorage.getItem(courseKey(id));
      if (!raw) continue;
      const ids = JSON.parse(raw);
      if (Array.isArray(ids) && ids.length) map[id] = ids;
    } catch {
      /* ignore malformed entry */
    }
  }
  return map;
}

// ---- Public API ----

// Load from Telegram CloudStorage when available, falling back to localStorage.
// CloudStorage callbacks can silently hang outside a real Telegram client, so we
// race them against a short timeout. When cloud data is found it is mirrored back
// into localStorage so offline reads reflect the latest cross-device state.
export function loadReadMap(): Promise<ReadMap> {
  const localMap = readLocalMap();
  const cs = cloudStorage();
  if (!cs) return Promise.resolve(localMap);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (map: ReadMap) => {
      if (settled) return;
      settled = true;
      resolve(map);
    };
    const timer = setTimeout(() => finish(localMap), CLOUD_TIMEOUT_MS);

    try {
      cs.getItems(COURSE_IDS.map(courseKey), (err, values) => {
        clearTimeout(timer);
        if (err || !values) return finish(localMap);

        const map: ReadMap = {};
        for (const id of COURSE_IDS) {
          const raw = values[courseKey(id)];
          if (!raw) continue;
          try {
            const ids = JSON.parse(raw);
            if (Array.isArray(ids) && ids.length) map[id] = ids;
          } catch {
            /* ignore malformed entry */
          }
        }

        // Mirror cloud → local so the local fallback stays current.
        for (const id of COURSE_IDS) writeLocalCourse(id, map[id] ?? []);
        finish(map);
      });
    } catch {
      clearTimeout(timer);
      finish(localMap);
    }
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

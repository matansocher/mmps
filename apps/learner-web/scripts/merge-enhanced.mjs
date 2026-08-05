// Merges enhanced course modules from src/data/authoring/enhanced/*.mjs back into
// src/data/courses.json. Each enhanced module must default-export a course object
// with the SAME id as the course it replaces. Validates structure before writing.
import { readdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const jsonPath = resolve(root, 'src/data/courses.json');
const enhancedDir = resolve(root, 'src/data/authoring/enhanced');

function validateCourse(c, file) {
  const fail = (msg) => {
    throw new Error(`[${file}] ${msg}`);
  };
  if (!c || typeof c !== 'object') fail('module default export is not an object');
  for (const k of ['id', 'title', 'icon', 'color']) if (!c[k] || typeof c[k] !== 'string') fail(`missing/invalid "${k}"`);
  if (!Array.isArray(c.lessons) || c.lessons.length < 8) fail(`lessons must be an array of >= 8 (got ${c.lessons?.length})`);
  const lessonIds = new Set();
  for (const [i, l] of c.lessons.entries()) {
    for (const k of ['id', 'group', 'nav', 'title', 'lede', 'html']) if (!l[k] || typeof l[k] !== 'string') fail(`lesson[${i}] missing/invalid "${k}"`);
    if (lessonIds.has(l.id)) fail(`duplicate lesson id "${l.id}"`);
    lessonIds.add(l.id);
  }
  if (!Array.isArray(c.quizzes) || c.quizzes.length < 5) fail(`quizzes must be an array of >= 5 (got ${c.quizzes?.length})`);
  for (const [i, q] of c.quizzes.entries()) {
    if (!q.question || typeof q.question !== 'string') fail(`quiz[${i}] missing question`);
    if (!Array.isArray(q.options) || q.options.length < 2) fail(`quiz[${i}] needs >= 2 options`);
    if (q.options.filter((o) => o.correct).length !== 1) fail(`quiz[${i}] must have exactly 1 correct option`);
    for (const [j, o] of q.options.entries()) if (!o.text || typeof o.text !== 'string' || typeof o.correct !== 'boolean') fail(`quiz[${i}].option[${j}] invalid`);
    if (!q.explain || typeof q.explain !== 'string') fail(`quiz[${i}] missing explain`);
  }
}

const current = JSON.parse(await readFile(jsonPath, 'utf8'));
const byId = new Map(current.map((c) => [c.id, c]));

const files = readdirSync(enhancedDir).filter((f) => f.endsWith('.mjs'));
if (files.length === 0) {
  console.error('No enhanced modules found in', enhancedDir);
  process.exit(1);
}

let replaced = 0;
const seen = new Set();
for (const file of files.sort()) {
  const mod = await import(pathToFileURL(resolve(enhancedDir, file)).href);
  const course = mod.default;
  validateCourse(course, file);
  if (!byId.has(course.id)) throw new Error(`[${file}] id "${course.id}" not found in courses.json`);
  if (seen.has(course.id)) throw new Error(`[${file}] id "${course.id}" already merged from another file`);
  seen.add(course.id);
  byId.set(course.id, course);
  replaced++;
  console.log(`OK  ${course.id.padEnd(38)} ${String(course.lessons.length).padStart(2)} lessons, ${course.quizzes.length} quizzes`);
}

// Preserve original ordering of courses.json.
const merged = current.map((c) => byId.get(c.id));
await writeFile(jsonPath, JSON.stringify(merged, null, 2) + '\n');
console.log(`\nMerged ${replaced}/${current.length} courses into courses.json`);

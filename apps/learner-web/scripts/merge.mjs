import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const authoringDir = resolve(root, 'src/data/authoring');
const jsonPath = resolve(root, 'src/data/courses.json');

const ORIGINAL_6 = new Set([
  'multi-agent-patterns-course',
  'rag-deep-dive-course',
  'context-engineering-course',
  'embeddings-vector-databases-course',
  'finetuning-vs-rag-vs-prompting-course',
  'llm-eval-observability-course',
]);

function validate(c, sourceLabel) {
  const problems = [];
  for (const key of ['id', 'title', 'icon', 'color']) {
    if (typeof c?.[key] !== 'string' || !c[key]) problems.push(`missing ${key}`);
  }
  if (!Array.isArray(c?.lessons) || c.lessons.length === 0) problems.push('no lessons');
  else
    c.lessons.forEach((l, i) => {
      for (const key of ['id', 'group', 'nav', 'title', 'lede', 'html']) {
        if (typeof l?.[key] !== 'string') problems.push(`lesson[${i}] missing ${key}`);
      }
    });
  if (!Array.isArray(c?.quizzes)) problems.push('quizzes not array');
  else
    c.quizzes.forEach((q, i) => {
      if (typeof q?.question !== 'string') problems.push(`quiz[${i}] missing question`);
      if (!Array.isArray(q?.options) || q.options.length < 2) problems.push(`quiz[${i}] needs >=2 options`);
      else if (!q.options.some((o) => o.correct === true)) problems.push(`quiz[${i}] has no correct option`);
      if (typeof q?.explain !== 'string') problems.push(`quiz[${i}] missing explain`);
    });
  if (problems.length) throw new Error(`Invalid course from ${sourceLabel}: ${problems.join('; ')}`);
}

// 1. Keep the original 6 from the existing json.
const existing = JSON.parse(readFileSync(jsonPath, 'utf8'));
const base = existing.filter((c) => ORIGINAL_6.has(c.id));
if (base.length !== ORIGINAL_6.size) {
  throw new Error(`Expected ${ORIGINAL_6.size} original courses in courses.json, found ${base.length}`);
}

// 2. Import every authoring module (skip files starting with _).
const files = readdirSync(authoringDir)
  .filter((f) => f.endsWith('.mjs') && !f.startsWith('_'))
  .sort();

const authored = [];
for (const f of files) {
  const mod = await import(pathToFileURL(resolve(authoringDir, f)).href);
  const course = mod.default;
  validate(course, f);
  if (ORIGINAL_6.has(course.id)) throw new Error(`${f} collides with an original course id: ${course.id}`);
  authored.push(course);
}

// 3. Merge, dedup by id (authored wins), write.
const byId = new Map();
for (const c of [...base, ...authored]) byId.set(c.id, c);
const merged = [...byId.values()];

writeFileSync(jsonPath, JSON.stringify(merged, null, 2));

console.log(`Merged ${merged.length} courses (${base.length} original + ${authored.length} authored):`);
for (const c of merged) console.log(`  ${c.icon}  ${c.id.padEnd(38)} ${c.lessons.length} lessons, ${c.quizzes.length} quizzes`);

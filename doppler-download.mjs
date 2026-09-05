// Refreshes the local .env from Doppler before the app boots (wired as the
// `predev` / `predev:debug` hook in package.json).
//
// Ownership split:
//   - `.env`       — owned by Doppler. Regenerated from scratch on every run,
//                    so never hand-edit it; anything you add here is lost.
//   - `.env.local` — owned by you, per machine/worktree (LOCAL_ACTIVE_BOT_ID,
//                    PORT, local overrides). This script never touches it, and
//                    src/index.ts loads it first so it wins on conflict.
//
// Design goals:
//   - Never leave a half-written or empty .env: download to a temp file first,
//     then atomically move it into place only on success, and refuse to write
//     an empty payload over a working file.
//   - Never block local dev: if the Doppler CLI is missing or you're not set up
//     (e.g. you prefer a hand-managed .env, or you're offline), warn and exit 0
//     so `npm run dev` still starts with whatever .env already exists.
import { spawnSync } from 'node:child_process';
import { existsSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_PATH = resolve(process.cwd(), '.env');
const LOCAL_ENV_PATH = resolve(process.cwd(), '.env.local');
const TMP_PATH = resolve(process.cwd(), '.env.doppler.tmp');

// Machine-specific keys that belong in .env.local, not the shared Doppler config.
const LOCAL_ONLY_KEYS = ['LOCAL_ACTIVE_BOT_ID'];

function warn(message) {
  console.warn(`[doppler] ${message}`);
  if (existsSync(ENV_PATH)) {
    console.warn('[doppler] keeping existing .env — starting with current secrets.');
  } else {
    console.warn('[doppler] no .env found — copy .env.example to .env or run `npm run doppler:setup`.');
  }
}

const hasDoppler = spawnSync('doppler', ['--version'], { stdio: 'ignore' });
if (hasDoppler.error) {
  warn('CLI not found. Install it: https://docs.doppler.com/docs/install-cli');
  process.exit(0);
}

const result = spawnSync('doppler', ['secrets', 'download', '--no-file', '--format', 'env'], {
  encoding: 'utf8',
});

if (result.status !== 0) {
  rmSync(TMP_PATH, { force: true });
  warn(`download failed: ${(result.stderr || '').trim() || 'run `npm run doppler:setup` and `doppler login`.'}`);
  process.exit(0);
}

const secrets = result.stdout || '';
if (!secrets.trim()) {
  warn('download returned no secrets — refusing to overwrite .env with an empty file.');
  process.exit(0);
}

let writeError = null;
try {
  writeFileSync(TMP_PATH, secrets);
  renameSync(TMP_PATH, ENV_PATH);
} catch (err) {
  writeError = err;
}
rmSync(TMP_PATH, { force: true });

if (writeError) {
  warn(`could not write .env: ${writeError.message}`);
  process.exit(0);
}

console.log('[doppler] .env refreshed from Doppler.');

if (!existsSync(LOCAL_ENV_PATH)) {
  console.warn('[doppler] no .env.local found — create one for machine-specific values like LOCAL_ACTIVE_BOT_ID (see .env.example).');
}

const strayKeys = LOCAL_ONLY_KEYS.filter((key) => new RegExp(`^\\s*${key}\\s*=`, 'm').test(secrets));
if (strayKeys.length) {
  console.warn(`[doppler] ${strayKeys.join(', ')} came from Doppler but is machine-specific — remove it from the shared config and set it in .env.local instead.`);
}

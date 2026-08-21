// Refreshes the local .env from Doppler before the app boots (wired as the
// `predev` / `predev:debug` hook in package.json).
//
// Design goals:
//   - Never leave a half-written or empty .env: download to a temp file first,
//     then atomically move it into place only on success.
//   - Never block local dev: if the Doppler CLI is missing or you're not set up
//     (e.g. you prefer a hand-managed .env, or you're offline), warn and exit 0
//     so `npm run dev` still starts with whatever .env already exists.
import { spawnSync } from 'node:child_process';
import { existsSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_PATH = resolve(process.cwd(), '.env');
const TMP_PATH = resolve(process.cwd(), '.env.doppler.tmp');

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

writeFileSync(TMP_PATH, result.stdout);
renameSync(TMP_PATH, ENV_PATH);
console.log('[doppler] .env refreshed from Doppler.');

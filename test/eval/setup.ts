import { config } from 'dotenv';
import { env } from 'node:process';

// Load .env before any eval module (harness instantiates ChatOpenAI at import time,
// reading OPENAI_API_KEY). Vitest does not auto-load .env, and setupFiles run before
// the test module graph, so this is the earliest safe place.
// Doppler-backed evaluations share local overrides and development-only startup checks.
if (env.DOPPLER_PROJECT) {
  await import('../../local-env.mjs');
} else {
  config();
}

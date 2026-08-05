import { config } from 'dotenv';

// Load .env before any eval module (harness instantiates ChatOpenAI at import time,
// reading OPENAI_API_KEY). Vitest does not auto-load .env, and setupFiles run before
// the test module graph, so this is the earliest safe place.
config();

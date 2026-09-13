import { env } from 'node:process';

// The default harness sender (DEFAULT_USER_ID) represents the bot owner so the
// owner-only guard in ChatbotController lets existing E2E updates through.
env.MY_USER_ID = env.MY_USER_ID ?? '654321';

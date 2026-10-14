import { config } from 'dotenv';
import { env } from 'node:process';

if (env.DOPPLER_PROJECT && env.DOPPLER_ENVIRONMENT !== 'dev') {
  throw new Error('Local runs require a Doppler development environment. Do not supply a production service token.');
}

// Load before app imports; local files intentionally override injected development values.
for (const path of ['.env', '.env.local']) {
  const result = config({ path, override: true, quiet: true });
  if (result.error && result.error.code !== 'ENOENT') {
    throw new Error(`Could not read ${path}. Check the file and its permissions.`, { cause: result.error });
  }
}

if (env.IS_PROD !== 'false' || env.NODE_ENV !== 'development') {
  throw new Error('Local development requires IS_PROD=false and NODE_ENV=development. Check the Doppler dev config or your manual .env.');
}

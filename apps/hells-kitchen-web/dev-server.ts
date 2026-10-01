import express from 'express';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { env } from 'node:process';
import { registerHellsKitchenApiRoutes } from '../../src/features/hells-kitchen/api/hells-kitchen.api.controller';
import { parseSave } from '../../src/features/hells-kitchen/game/schema';
import type { Profile, Save } from '../../src/features/hells-kitchen/game/types';
import { serveHellsKitchen } from '../../src/features/hells-kitchen/hells-kitchen.init';

if (env.IS_PROD === 'true') throw new Error('The preview server must not run in production');
if (!env.HELLS_KITCHEN_APP_PASSWORD) throw new Error('Set HELLS_KITCHEN_APP_PASSWORD for the local preview');
const file = '.tmp/hells-kitchen-preview.json';
await mkdir('.tmp', { recursive: true });
let save: Save | null = null;
try {
  save = parseSave(JSON.parse(await readFile(file, 'utf8')));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}
let writing = false;
const app = express();
app.use(express.json({ limit: '100kb' }));
registerHellsKitchenApiRoutes(app, {
  get: async () => save,
  put: async (revision: number, profile: Profile) => {
    if (writing || revision !== (save?.revision ?? 0)) return null;
    writing = true;
    try {
      const next: Save = { revision: revision + 1, profile, updatedAt: new Date().toISOString() };
      await writeFile(`${file}.tmp`, JSON.stringify(next));
      await rename(`${file}.tmp`, file);
      save = next;
      return save;
    } finally {
      writing = false;
    }
  },
});
serveHellsKitchen(app);
const port = Number(env.HELLS_KITCHEN_API_PORT || 3387);
app.listen(port, '127.0.0.1', () => console.log(`Hell’s Kitchen isolated preview backend: http://127.0.0.1:${port}/hells-kitchen/`));

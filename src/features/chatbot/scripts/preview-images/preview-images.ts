import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { argv } from 'node:process';
import { getErrorMessage, Logger } from '@core/utils';
import { LEAGUE_TABLE_PREVIEWS } from './league-table.preview';
import { RAIL_PREVIEWS } from './rail.preview';
import type { ImagePreview } from './types';

// Usage: npx tsx src/features/chatbot/scripts/preview-images/preview-images.ts [name-filter]
const logger = new Logger('chatbot:script:preview-images');

const OUTPUT_DIR = '/tmp/mmps-images';
const PREVIEWS: readonly ImagePreview[] = [...RAIL_PREVIEWS, ...LEAGUE_TABLE_PREVIEWS];

async function main(): Promise<void> {
  const filter = argv[2];
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const previews = PREVIEWS.filter((preview) => !filter || preview.name.includes(filter));
  for (const preview of previews) {
    try {
      const image = await preview.render();
      if (!image) {
        logger.warn(`${preview.name}: builder returned no image`);
        continue;
      }
      const target = path.join(OUTPUT_DIR, `${preview.name}.png`);
      writeFileSync(target, image);
      logger.log(`${preview.name}: ${target}`);
    } catch (err) {
      logger.error(`${preview.name}: ${getErrorMessage(err)}`);
    }
  }
}

main();

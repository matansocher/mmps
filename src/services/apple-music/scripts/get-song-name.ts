// Usage: npx tsx src/services/apple-music/scripts/get-song-name.ts "<apple music song link>"
import { getAppleMusicSong } from '..';

async function main(): Promise<void> {
  const link = process.argv[2];
  if (!link) {
    console.error('Usage: npx tsx src/services/apple-music/scripts/get-song-name.ts "<apple music song link>"');
    process.exit(1);
  }

  try {
    const song = await getAppleMusicSong(link);
    console.log(`${song.name} — ${song.artist} (${song.album})`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();

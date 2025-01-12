import { promises as fs } from 'fs';

export async function deleteFile(audioFileLocalPath: string): Promise<void> {
  try {
    await fs.unlink(audioFileLocalPath);
  } catch {}
}

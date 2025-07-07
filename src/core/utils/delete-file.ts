import { promises as fs } from 'fs';

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {}
}

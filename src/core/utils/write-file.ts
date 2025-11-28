import { promises as fs } from 'fs';

export async function writeFile(filePath: string, fileContent: string): Promise<void> {
  try {
    await fs.writeFile(filePath, fileContent);
  } catch (err) {
    return;
  }
}

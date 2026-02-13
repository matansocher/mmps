import { promises as fs } from 'fs';
import path from 'path';
import type { Bot } from 'grammy';

export async function downloadFile(bot: Bot, fileId: string, destDir: string): Promise<string> {
  const file = await bot.api.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
  const response = await fetch(fileUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  const destPath = path.join(destDir, path.basename(file.file_path));
  await fs.writeFile(destPath, buffer);
  return destPath;
}
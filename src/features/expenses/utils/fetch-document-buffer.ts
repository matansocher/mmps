import type { Bot } from 'grammy';

export async function fetchDocumentBuffer(bot: Bot, fileId: string): Promise<Buffer> {
  const file = await bot.api.getFile(fileId);
  const url = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download failed: ${response.status} ${response.statusText}`);
  return Buffer.from(await response.arrayBuffer());
}

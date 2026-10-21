import fs from 'fs';
import path from 'path';
import { toFile } from 'openai';
import { TRANSCRIPTION_MODEL } from '../constants';
import { provideOpenAiClient } from '../provide-openai-client';

// Telegram voice notes are saved as `.oga`, which the transcription API rejects by extension even though the content is plain Ogg/Opus.
const EXTENSION_ALIASES: Record<string, string> = { '.oga': '.ogg', '.opus': '.ogg' };

export function getTranscriptionFileName(audioFilePath: string): string {
  const { name, ext } = path.parse(audioFilePath);
  const normalizedExt = EXTENSION_ALIASES[ext.toLowerCase()] ?? ext;
  return `${name}${normalizedExt}`;
}

export async function getTranscriptFromAudio(audioFilePath: string): Promise<string> {
  const client = provideOpenAiClient();
  const file = await toFile(fs.createReadStream(audioFilePath), getTranscriptionFileName(audioFilePath));
  const result = await client.audio.transcriptions.create({
    file,
    model: TRANSCRIPTION_MODEL,
  });
  return result.text;
}

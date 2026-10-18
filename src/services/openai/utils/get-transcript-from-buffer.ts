import { toFile } from 'openai';
import { TRANSCRIPTION_MODEL } from '../constants';
import { provideOpenAiClient } from '../provide-openai-client';

export async function getTranscriptFromBuffer(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
  const client = provideOpenAiClient();
  const file = await toFile(buffer, fileName, { type: mimeType });
  const result = await client.audio.transcriptions.create({ file, model: TRANSCRIPTION_MODEL });
  return result.text;
}

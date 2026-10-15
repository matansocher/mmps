import fs from 'fs';
import { TRANSCRIPTION_MODEL } from '../constants';
import { provideOpenAiClient } from '../provide-openai-client';

export async function getTranscriptFromAudio(audioFilePath: string): Promise<string> {
  const client = provideOpenAiClient();
  const file = fs.createReadStream(audioFilePath);
  const result = await client.audio.transcriptions.create({
    file,
    model: TRANSCRIPTION_MODEL,
  });
  return result.text;
}

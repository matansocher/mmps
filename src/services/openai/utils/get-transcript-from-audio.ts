import fs from 'fs';
import { SOUND_MODEL } from '../constants';
import { provideOpenAiClient } from '../provide-openai-client';

export async function getTranscriptFromAudio(audioFilePath: string, language = 'en-US'): Promise<string> {
  const client = provideOpenAiClient();
  const file = fs.createReadStream(audioFilePath);
  const result = await client.audio.transcriptions.create({
    file,
    model: SOUND_MODEL,
    language,
  });
  return result.text;
}

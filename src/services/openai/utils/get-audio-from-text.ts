import { TEXT_TO_SPEECH_MODEL, TEXT_TO_SPEECH_VOICE } from '../constants';
import { provideOpenAiClient } from '../provide-openai-client';

export async function getAudioFromText(text: string, instructions?: string) {
  const client = provideOpenAiClient();
  return client.audio.speech.create({
    model: TEXT_TO_SPEECH_MODEL,
    voice: TEXT_TO_SPEECH_VOICE,
    input: text,
    instructions,
  });
}

import { tool } from '@langchain/core/tools';
import fs from 'fs/promises';
import { z } from 'zod';
import { LOCAL_FILES_PATH } from '@core/config';
import { getAudioFromText } from '@services/openai';

const schema = z.object({
  text: z.string().describe('The text to convert to speech'),
  voice: z.string().optional().describe('Optional voice selection for text-to-speech'),
});

async function runner({ text, voice }: z.infer<typeof schema>) {
  const result = await getAudioFromText(text, voice);
  const audioFilePath = `${LOCAL_FILES_PATH}/text-to-speech-${new Date().getTime()}.mp3`;
  const buffer = Buffer.from(await result.arrayBuffer());
  await fs.writeFile(audioFilePath, buffer);
  return audioFilePath;
}

export const textToSpeechTool = tool(runner, {
  name: 'text_to_speech',
  description: 'Convert text to speech and generate audio files',
  schema,
});

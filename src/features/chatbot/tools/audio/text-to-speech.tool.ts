import fs from 'fs/promises';
import { z } from 'zod';
import { LOCAL_FILES_PATH } from '@core/config';
import { getAudioFromText } from '@services/openai';
import { ToolConfig, ToolExecutionContext, ToolInstance } from '../../types';

export const textToSpeechConfig: ToolConfig = {
  name: 'text_to_speech',
  description: 'Convert text to speech and generate audio files',
  schema: z.object({
    text: z.string().describe('The text to convert to speech'),
    voice: z.string().optional().describe('Optional voice selection for text-to-speech'),
  }),
  keywords: ['speak', 'voice', 'audio', 'say', 'read aloud', 'text to speech', 'tts', 'pronounce'],
  instructions: 'Use this tool when users want to hear text spoken aloud, convert text to audio, or request voice output. Perfect for accessibility or when users prefer audio responses.',
};

export class TextToSpeechTool implements ToolInstance {
  getName(): string {
    return textToSpeechConfig.name;
  }

  getDescription(): string {
    return textToSpeechConfig.description;
  }

  getSchema(): z.ZodObject<any> {
    return textToSpeechConfig.schema;
  }

  getKeywords(): string[] {
    return textToSpeechConfig.keywords;
  }

  getInstructions(): string {
    return textToSpeechConfig.instructions || '';
  }

  async execute(context: ToolExecutionContext): Promise<string> {
    const { text, voice } = context.parameters;

    if (!text) {
      throw new Error('Text parameter is required for text-to-speech conversion');
    }

    try {
      const result = await getAudioFromText(text, voice);
      const audioFilePath = `${LOCAL_FILES_PATH}/text-to-speech-${new Date().getTime()}.mp3`;
      const buffer = Buffer.from(await result.arrayBuffer());
      await fs.writeFile(audioFilePath, buffer);
      return audioFilePath;
    } catch (err) {
      console.error(`Error generating text-to-speech: ${err}`);
      throw new Error(`Failed to generate speech from text: ${err.message}`);
    }
  }
}

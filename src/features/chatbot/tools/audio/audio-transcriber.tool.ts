import { z } from 'zod';
import { deleteFile } from '@core/utils';
import { getTranscriptFromAudio } from '@services/openai';
import { ToolConfig, ToolExecutionContext, ToolInstance } from '../../types';

export const audioTranscriberConfig: ToolConfig = {
  name: 'audio_transcriber',
  description: 'Transcribe audio files and convert speech to text',
  schema: z.object({
    audioFilePath: z.string().describe('The local file path of the audio file to transcribe'),
  }),
  keywords: ['audio', 'transcribe', 'speech', 'voice', 'transcript', 'convert to text', 'listen'],
  instructions: 'Use this tool when users send audio messages or voice notes that need to be transcribed to text. Perfect for converting speech to text for further processing.',
};

export class AudioTranscriberTool implements ToolInstance {
  getName(): string {
    return audioTranscriberConfig.name;
  }

  getDescription(): string {
    return audioTranscriberConfig.description;
  }

  getSchema(): z.ZodObject<any> {
    return audioTranscriberConfig.schema;
  }

  getKeywords(): string[] {
    return audioTranscriberConfig.keywords;
  }

  getInstructions(): string {
    return audioTranscriberConfig.instructions || '';
  }

  async execute(context: ToolExecutionContext): Promise<string> {
    const { audioFilePath } = context.parameters;

    if (!audioFilePath) {
      throw new Error('Audio file path parameter is required');
    }

    try {
      const transcript = await getTranscriptFromAudio(audioFilePath, 'he');
      deleteFile(audioFilePath);
      return transcript || 'I was unable to transcribe the audio. The audio might be unclear or in an unsupported format.';
    } catch (error) {
      deleteFile(audioFilePath);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }
}

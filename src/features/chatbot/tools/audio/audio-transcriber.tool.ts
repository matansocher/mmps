import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { deleteFile } from '@core/utils';
import { getTranscriptFromAudio } from '@services/openai';

const schema = z.object({
  audioFilePath: z.string().describe('The local file path of the audio file to transcribe'),
});

async function runner({ audioFilePath }: z.infer<typeof schema>) {
  try {
    const transcript = await getTranscriptFromAudio(audioFilePath, 'he');
    deleteFile(audioFilePath);
    return transcript || 'I was unable to transcribe the audio. The audio might be unclear or in an unsupported format.';
  } catch (err) {
    deleteFile(audioFilePath);
    throw new Error(`Failed to transcribe audio: ${err.message}`);
  }
}

export const audioTranscriberTool = tool(runner, {
  name: 'audio_transcriber',
  description: 'Transcribe audio files and convert speech to text',
  schema,
});

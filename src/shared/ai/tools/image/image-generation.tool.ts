import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { generateImage } from '@services/xai';

const schema = z.object({
  prompt: z.string().describe('The enhanced, detailed prompt to generate the image. Should come from the prompt enhancer tool.'),
});

async function runner({ prompt }: z.infer<typeof schema>) {
  return await generateImage(prompt);
}

export const imageGeneratorTool = tool(runner, {
  name: 'image_generator',
  description: 'Generate an image using an enhanced, detailed prompt. This tool should be used AFTER the prompt enhancer tool.',
  schema,
});

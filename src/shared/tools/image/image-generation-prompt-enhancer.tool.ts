import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getChatCompletion } from '@services/anthropic';

const schema = z.object({
  prompt: z.string().describe('The basic user prompt that needs to be enhanced for better image generation results.'),
});

async function runner({ prompt }: z.infer<typeof schema>) {
  try {
    const enhancementPrompt = [
      'Enhance this image generation prompt by adding specific artistic details, style, lighting, composition, and quality descriptors while keeping the original intent.',
      'Return only the enhanced prompt without explanations. make sure that the prompt length is not longer than 1023 characters.',
      `Original: "${prompt}"`,
    ].join('\n');

    const result = await getChatCompletion('', enhancementPrompt);
    const textContent = result.content.find((block) => block.type === 'text');
    const promptContent = textContent?.text || prompt;
    return promptContent.trim().slice(0, 1023);
  } catch (err) {
    console.error(`Error enhancing prompt: ${err}`);
    return `${prompt}, highly detailed, professional quality, vibrant colors, excellent composition, sharp focus, 4K resolution`;
  }
}

export const imageGeneratorPromptEnhancerTool = tool(runner, {
  name: 'image_generator_prompt_enhancer',
  description: 'Enhance and improve prompts for image generation to make them more detailed, specific, and likely to produce better results. This tool should be used BEFORE generating images.',
  schema,
});

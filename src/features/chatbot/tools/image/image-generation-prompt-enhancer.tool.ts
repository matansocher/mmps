import { z } from 'zod';
import { getChatCompletion } from '@services/anthropic';
import { ToolConfig, ToolExecutionContext, ToolInstance } from '../../types';

export const imageGeneratorToolPromptEnhancerConfig: ToolConfig = {
  name: 'image_generator_prompt_enhancer',
  description: 'Enhance and improve prompts for image generation to make them more detailed, specific, and likely to produce better results. This tool should be used BEFORE generating images.',
  schema: z.object({
    prompt: z.string().describe('The basic user prompt that needs to be enhanced for better image generation results.'),
  }),
  keywords: ['enhance', 'improve', 'prompt', 'better', 'detailed', 'refine'],
  instructions: 'Use this tool FIRST when a user wants to generate an image. It will enhance their basic prompt to produce better, more detailed results.',
};

export class ImageGeneratorPromptEnhancerTool implements ToolInstance {
  getName(): string {
    return imageGeneratorToolPromptEnhancerConfig.name;
  }

  getDescription(): string {
    return imageGeneratorToolPromptEnhancerConfig.description;
  }

  getSchema(): z.ZodObject<any> {
    return imageGeneratorToolPromptEnhancerConfig.schema;
  }

  getKeywords(): string[] {
    return imageGeneratorToolPromptEnhancerConfig.keywords;
  }

  getInstructions(): string {
    return imageGeneratorToolPromptEnhancerConfig.instructions || '';
  }

  async execute(context: ToolExecutionContext): Promise<string> {
    const { prompt } = context.parameters;

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
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      return `${prompt}, highly detailed, professional quality, vibrant colors, excellent composition, sharp focus, 4K resolution`;
    }
  }
}

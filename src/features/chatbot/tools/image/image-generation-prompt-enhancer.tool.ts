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
      if (!prompt || prompt.trim().length < 2) {
        throw new Error('Prompt is too short. Please provide a basic description of what you want to generate.');
      }

      const enhancementPrompt = [
        'Enhance this image generation prompt by adding specific artistic details, style, lighting, composition, and quality descriptors while keeping the original intent. Return only the enhanced prompt without explanations. make sure that the prompt length is not longer than 1023 characters.',
        `Original: "${prompt}"`,
        'Enhanced version:',
      ].join('\n');

      const result = await getChatCompletion('', enhancementPrompt);

      let enhancedPrompt = '';
      if (Array.isArray(result.content)) {
        enhancedPrompt = result.content
          .filter((item) => item.type === 'text')
          .map((item) => item.text)
          .join(' ');
      } else {
        enhancedPrompt = result.content;
      }

      enhancedPrompt = enhancedPrompt.trim();

      const prefixesToRemove = ['Enhanced version:', 'Enhanced prompt:', 'Here is the enhanced prompt:', 'Enhanced:'];

      for (const prefix of prefixesToRemove) {
        if (enhancedPrompt.toLowerCase().startsWith(prefix.toLowerCase())) {
          enhancedPrompt = enhancedPrompt.substring(prefix.length).trim();
        }
      }

      // Ensure we have a meaningful result
      if (!enhancedPrompt) {
        throw new Error('Enhancement failed to produce meaningful result');
      }

      return `✨ Enhanced prompt: ${enhancedPrompt.slice(0, 1023)}`;
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      const fallbackPrompt = `${prompt}, highly detailed, professional quality, vibrant colors, excellent composition, sharp focus, 4K resolution`;
      return `✨ Enhanced prompt (fallback): ${fallbackPrompt}`;
    }
  }
}

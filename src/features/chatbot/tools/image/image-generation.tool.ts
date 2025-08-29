import { z } from 'zod';
import { generateImage } from '@services/xai';
import { ToolConfig, ToolExecutionContext, ToolInstance } from '../../types';

export const imageGeneratorConfig: ToolConfig = {
  name: 'image_generator',
  description: 'Generate an image using an enhanced, detailed prompt. This tool should be used AFTER the prompt enhancer tool.',
  schema: z.object({
    prompt: z.string().describe('The enhanced, detailed prompt to generate the image. Should come from the prompt enhancer tool.'),
  }),
  keywords: ['image', 'generate', 'picture', 'photo', 'create', 'visual', 'draw', 'make'],
  instructions: 'Use this tool to generate an image based on an enhanced prompt. Always use the image_generator_prompt_enhancer tool first to improve the prompt quality.',
};

export class ImageGeneratorTool implements ToolInstance {
  getName(): string {
    return imageGeneratorConfig.name;
  }

  getDescription(): string {
    return imageGeneratorConfig.description;
  }

  getSchema(): z.ZodObject<any> {
    return imageGeneratorConfig.schema;
  }

  getKeywords(): string[] {
    return imageGeneratorConfig.keywords;
  }

  getInstructions(): string {
    return imageGeneratorConfig.instructions || '';
  }

  async execute(context: ToolExecutionContext): Promise<string> {
    const { prompt } = context.parameters;

    try {
      return generateImage(prompt);
    } catch (error) {
      console.error('Error generating image:', error);
      throw new Error(`Failed to generate image: ${error.message}`);
    }
  }
}

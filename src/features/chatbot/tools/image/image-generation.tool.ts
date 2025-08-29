import { z } from 'zod';
import { generateImage } from '@services/xai';
import { ToolConfig, ToolExecutionContext, ToolInstance } from '../../types';

export const imageGeneratorConfig: ToolConfig = {
  name: 'image_generator',
  description: 'Generate an image using the prompt provided.',
  schema: z.object({
    prompt: z.string().describe('The prompt to generate the image.'),
  }),
  keywords: ['image', 'generate', 'picture', 'photo', 'create', 'visual'],
  instructions: 'Use this tool to generate an image based on the provided prompt.',
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
      console.error('Error analyzing image:', error);
      throw new Error(`Failed to analyze image: ${error.message}`);
    }
  }
}

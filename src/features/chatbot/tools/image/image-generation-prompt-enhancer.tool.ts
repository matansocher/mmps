import { z } from 'zod';
import { getChatCompletion } from '@services/anthropic';
import { ToolConfig, ToolExecutionContext, ToolInstance } from '../../types';

export const imageGeneratorToolPromptEnhancerConfig: ToolConfig = {
  name: 'image_generator_prompt_enhancer',
  description: 'Generate enhanced prompts for image generation based on the provided prompt, so the image is more detailed and accurate.',
  schema: z.object({
    prompt: z.string().describe('The user prompt to generate the enhanced prompt.'),
  }),
  keywords: ['image', 'generate', 'picture', 'photo', 'create', 'visual'],
  instructions: 'Use this tool to enhance the user prompt before using the image generator tool to get better results.',
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

  async execute(context: ToolExecutionContext): Promise<any> {
    // $$$$$$$$$$$$$$$$$$$
    const { prompt } = context.parameters;

    try {
      const systemPrompt = `You are an expert prompt enhancer for an image generation AI model. Your task is to take a user's prompt and enhance it by adding more detail, context, and specificity to improve the quality of the generated image. Make sure to keep the original intent of the user's prompt while making it more descriptive.`;
      const result = await getChatCompletion(systemPrompt, prompt);
      return result.content;
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw new Error(`Failed to analyze image: ${error.message}`);
    }
  }
}

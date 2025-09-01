import { z } from 'zod';
import { analyzeImage } from '@services/openai';
import { ToolConfig, ToolExecutionContext, ToolInstance } from '../../types';

export const imageAnalyzerConfig: ToolConfig = {
  name: 'image_analyzer',
  description: 'Analyze images and provide detailed descriptions of what is seen in the image',
  schema: z.object({
    imageUrl: z.string().describe('The URL of the image to analyze'),
    prompt: z.string().optional().describe('Optional custom prompt for image analysis. If not provided, a default analysis prompt will be used.'),
  }),
  keywords: ['image', 'analyze', 'picture', 'photo', 'describe', 'what do you see', 'visual', 'look at'],
  instructions:
    'Use this tool when users want to analyze images, get descriptions of pictures, or understand visual content. Perfect for questions like "What do you see in this image?" or "Analyze this picture".',
};

export class ImageAnalyzerTool implements ToolInstance {
  getName(): string {
    return imageAnalyzerConfig.name;
  }

  getDescription(): string {
    return imageAnalyzerConfig.description;
  }

  getSchema(): z.ZodObject<any> {
    return imageAnalyzerConfig.schema;
  }

  getKeywords(): string[] {
    return imageAnalyzerConfig.keywords;
  }

  getInstructions(): string {
    return imageAnalyzerConfig.instructions || '';
  }

  async execute(context: ToolExecutionContext): Promise<string> {
    const { imageUrl, prompt } = context.parameters;

    if (!imageUrl) {
      throw new Error('Image URL parameter is required');
    }

    try {
      const analysisPrompt = prompt || 'Provide a detailed analysis of the following image, describing what you see, any text present, objects, people, activities, and any other relevant details:';

      const imageAnalysisText = await analyzeImage(analysisPrompt, imageUrl);

      return imageAnalysisText || 'I was unable to analyze the image. Please try again with a different image.';
    } catch (err) {
      console.error(`Error analyzing image: ${err}`);
      throw new Error(`Failed to analyze image: ${err.message}`);
    }
  }
}

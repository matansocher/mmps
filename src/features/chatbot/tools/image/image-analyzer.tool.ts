import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { analyzeImage } from '@services/openai';

const schema = z.object({
  imageUrl: z.string().describe('The URL of the image to analyze'),
  prompt: z.string().optional().describe('Optional custom prompt for image analysis. If not provided, a default analysis prompt will be used.'),
});

async function runner({ imageUrl, prompt }: z.infer<typeof schema>) {
  const analysisPrompt = prompt || 'Provide a detailed analysis of the following image, describing what you see, any text present, objects, people, activities, and any other relevant details:';
  const imageAnalysisText = await analyzeImage(analysisPrompt, imageUrl);
  return imageAnalysisText || 'I was unable to analyze the image. Please try again with a different image.';
}

export const imageAnalyzerTool = tool(runner, {
  name: 'image_analyzer',
  description: 'Analyze images and provide detailed descriptions of what is seen in the image',
  schema,
});

import { z } from 'zod';

export const TopicResponseSchema = z.object({
  text: z.string().max(4095).describe('The main topic content text that will be displayed to the user'),
  estimatedReadingTime: z.number().min(1).describe('Estimated time in minutes for an average reader to complete and understand this content (assume 200-250 words per minute reading speed)'),
});

export const TopicSummarySchema = z.object({
  summary: z
    .string()
    .max(1000)
    .describe('A comprehensive summary of the topic discussion in Hebrew, covering the main points and concepts learned. Should be 2-3 paragraphs that capture the essence of what was taught.'),
  keyTakeaways: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe('3-5 key takeaways in Hebrew that the user should remember from this topic. Each should be a concise, actionable insight or important concept.'),
});

export type TopicResponse = z.infer<typeof TopicResponseSchema>;
export type TopicSummaryResponse = z.infer<typeof TopicSummarySchema>;

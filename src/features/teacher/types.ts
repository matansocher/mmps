import { z } from 'zod';

export const CourseResponseSchema = z.object({
  text: z.string().max(4095).describe('The main course content text that will be displayed to the user'),
  estimatedReadingTime: z.number().min(1).describe('Estimated time in minutes for an average reader to complete and understand this content (assume 200-250 words per minute reading speed)'),
});

export const CourseSummarySchema = z.object({
  summary: z
    .string()
    .max(1000)
    .describe('A comprehensive summary of the course discussion, covering the main points and concepts learned. Should be 2-3 paragraphs that capture the essence of what was taught.'),
  keyTakeaways: z.array(z.string()).min(3).max(5).describe('3-5 key takeaways that the user should remember from this course. Each should be a concise, actionable insight or important concept.'),
});

export type CourseResponse = z.infer<typeof CourseResponseSchema>;

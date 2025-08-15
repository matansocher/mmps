import { z } from 'zod';

export const TopicResponseSchema = z.object({
  text: z.string().max(4095).describe('The main topic content text that will be displayed to the user'),
  estimatedReadingTime: z.number().min(1).describe('Estimated time in minutes for an average reader to complete and understand this content (assume 200-250 words per minute reading speed)'),
  // keyTakeaways: z
  //   .array(z.string())
  //   .min(3)
  //   .max(5)
  //   .describe(
  //     "3-5 bullet points summarizing the most important concepts students should remember. Each should be a complete sentence starting with an action verb. Example: 'Understand how event loops manage asynchronous operations in JavaScript'",
  //   ),
  // followUpQuestions: z
  //   .array(z.string())
  //   .max(3)
  //   .describe('Up to 3 relevant follow-up questions that the user might want to ask next, based on the current answer. Should help deepen understanding or explore related topics.'),
});

export type TopicResponse = z.infer<typeof TopicResponseSchema>;

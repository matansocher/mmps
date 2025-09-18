import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { MY_USER_ID } from '@core/config';
import { handleCompleteTopic, handleContinueTopic, handleGetActiveTopic, handleGetProgress, handleGetSummary, handleStartTopic, handleToggleDailyLessons } from './utils';

const educatorToolSchema = z.object({
  action: z.enum(['start_topic', 'continue_topic', 'complete_topic', 'get_summary', 'get_progress', 'toggle_daily_lessons', 'get_active_topic']).describe('The action to perform'),
  input: z.string().optional().describe('Additional input for the action (e.g., question for continue_topic)'),
  enabled: z.boolean().optional().describe('For toggle_daily_lessons action - true to enable, false to disable'),
});

export const educatorTool = new DynamicStructuredTool({
  name: 'educator',
  description:
    'Educational tool for teaching topics, managing learning progress, and generating summaries. Use this when users want to learn something new, continue learning, or check their progress.',
  schema: educatorToolSchema,
  func: async ({ action, input, enabled }) => {
    switch (action) {
      case 'start_topic':
        return handleStartTopic(MY_USER_ID);

      case 'continue_topic':
        return handleContinueTopic(MY_USER_ID, input || '');

      case 'complete_topic':
        return handleCompleteTopic(MY_USER_ID);

      case 'get_summary':
        return handleGetSummary(MY_USER_ID);

      case 'get_progress':
        return handleGetProgress(MY_USER_ID);

      case 'toggle_daily_lessons':
        return handleToggleDailyLessons(MY_USER_ID, enabled || false);

      case 'get_active_topic':
        return handleGetActiveTopic(MY_USER_ID);

      default:
        return 'Invalid action specified.';
    }
  },
});

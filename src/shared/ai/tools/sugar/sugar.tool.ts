import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { MY_USER_ID } from '@core/config';
import {
  handleCloseSession,
  handleCompareFoods,
  handleGetActive,
  handleLogReading,
  handleQueryFood,
  handleQueryTrends,
  handleRecentSessions,
  handleStartSession,
} from './utils';

const schema = z.object({
  action: z
    .enum(['start_session', 'log_reading', 'close_session', 'get_active', 'query_food', 'query_trends', 'compare_foods', 'recent_sessions'])
    .describe('Action to perform'),

  // For start_session
  mealDescription: z.string().optional().describe('Description of the meal being eaten'),
  foods: z.array(z.string()).optional().describe('Individual food items extracted from the meal description'),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'fasting']).optional().describe('Type of meal'),
  tags: z.array(z.string()).optional().describe('Tags for the session (e.g., high-carb, experiment)'),

  // For log_reading
  value: z.number().optional().describe('Glucose value in mg/dL'),
  minutesAfterMeal: z.number().optional().describe('Minutes after meal started. If not provided, calculated from session start time'),

  // For queries
  foodQuery: z.string().optional().describe('Food name to query for analysis'),
  compareFoods: z.array(z.string()).optional().describe('Array of food names to compare'),
  dateRange: z.enum(['today', 'week', 'month', 'all']).optional().describe('Date range for trend queries'),
});

async function runner({ action, mealDescription, foods, mealType, tags, value, minutesAfterMeal, foodQuery, compareFoods, dateRange }: z.infer<typeof schema>): Promise<string> {
  try {
    const chatId = MY_USER_ID;

    switch (action) {
      case 'start_session':
        return handleStartSession({ chatId, mealDescription, foods, mealType, tags });

      case 'log_reading':
        return handleLogReading({ chatId, value, minutesAfterMeal });

      case 'close_session':
        return handleCloseSession({ chatId });

      case 'get_active':
        return handleGetActive({ chatId });

      case 'query_food':
        return handleQueryFood({ chatId, foodQuery });

      case 'query_trends':
        return handleQueryTrends({ chatId, dateRange });

      case 'compare_foods':
        return handleCompareFoods({ chatId, compareFoods });

      case 'recent_sessions':
        return handleRecentSessions({ chatId });

      default:
        return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to ${action}: ${err.message}` });
  }
}

export const sugarTool = tool(runner, {
  name: 'sugar_tracker',
  description: `Track blood glucose responses to meals. This tool helps log glucose readings during meals and analyze how different foods affect blood sugar levels.

Actions:
- start_session: Start tracking a new meal. Provide mealDescription, optionally foods array, mealType, and tags.
- log_reading: Log a glucose reading. Provide value in mg/dL. minutesAfterMeal is auto-calculated if not provided.
- close_session: End the current meal tracking session.
- get_active: Check if there's an active tracking session.
- query_food: Analyze glucose response for a specific food. Provide foodQuery.
- query_trends: Get overall glucose trends. Optionally provide dateRange (today, week, month, all).
- compare_foods: Compare glucose responses between foods. Provide compareFoods array with 2+ food names.
- recent_sessions: View recent completed sessions.

Workflow:
1. User says "Starting meal: oatmeal with banana" → start_session
2. User says "85" or "baseline 85" → log_reading with value=85, minutesAfterMeal=0
3. User says "110 at 30 min" → log_reading with value=110, minutesAfterMeal=30
4. User says "done" → close_session
5. User asks "How does oatmeal affect me?" → query_food with foodQuery="oatmeal"
6. User asks "Compare rice vs bread" → compare_foods with compareFoods=["rice", "bread"]`,
  schema,
});

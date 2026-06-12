import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { handleAdd, handleList, handleRemove, handleSuggest } from './utils';

const schema = z.object({
  action: z.enum(['suggest', 'list', 'add', 'remove']).describe('The action to perform'),
  name: z.string().optional().describe('The friend name (required for add and remove actions)'),
});

async function runner({ action, name }: z.infer<typeof schema>): Promise<string> {
  try {
    switch (action) {
      case 'suggest':
        return handleSuggest();
      case 'list':
        return handleList();
      case 'add':
        return handleAdd({ name });
      case 'remove':
        return handleRemove({ name });
      default:
        return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to ${action}: ${err.message}` });
  }
}

export const meetupsTool = tool(runner, {
  name: 'meetups',
  description: `Manage a personal list of friends to meet up with and get random suggestions of who to meet.

Actions:
- suggest: Randomly pick 5 friends from the list to suggest meeting up with
- list: Return the full meet list with names and IDs
- add: Add a new person to the meet list by name
- remove: Remove a person from the meet list by their exact full name

IMPORTANT for remove: always call "list" first to get the full names, then use your context to identify the correct person and call "remove" with their exact full name. Never guess — match based on the listed names.

Use this tool when the user asks who they should meet, hang out with, or get together with in person, or when they want to manage their meet list. This is separate from the contacts tool, which is for friends to call or reach out to.`,
  schema,
});

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { deletePreference, getAllPreferences, getPreference, savePreference, searchPreferences } from '@shared/preferences';

const preferencesSchema = z.object({
  action: z
    .enum(['save', 'get', 'list', 'delete', 'search'])
    .describe('The action to perform: save (save/update preference), get (retrieve specific preference), list (get all preferences), delete (remove preference), search (find preferences by keyword)'),
  key: z
    .string()
    .optional()
    .describe('The preference key/name (e.g., "favorite_color", "dietary_restrictions"). Required for save, get, and delete actions. Use descriptive, lowercase keys with underscores.'),
  value: z.string().optional().describe('The preference value/content. Required for save action.'),
  keyword: z.string().optional().describe('Search keyword to find preferences. Required for search action. Searches both keys and values.'),
});

async function runner({ action, key, value, keyword }: z.infer<typeof preferencesSchema>): Promise<string> {
  try {
    switch (action) {
      case 'save': {
        if (!key || !value) {
          return JSON.stringify({ error: 'Both key and value are required for save action' });
        }

        await savePreference({ key, value });
        return JSON.stringify({ success: true, message: `Preference "${key}" saved successfully`, key, value });
      }

      case 'get': {
        if (!key) {
          return JSON.stringify({ error: 'Key is required for get action' });
        }

        const preference = await getPreference(key);
        if (!preference) {
          return JSON.stringify({ success: false, message: `No preference found for key "${key}"` });
        }

        return JSON.stringify({ success: true, preference: { key: preference.key, value: preference.value, updatedAt: preference.updatedAt } });
      }

      case 'list': {
        const preferences = await getAllPreferences();
        if (preferences.length === 0) {
          return JSON.stringify({ success: true, message: 'No preferences saved yet', preferences: [] });
        }

        const formattedPreferences = preferences.map((p) => ({ key: p.key, value: p.value, updatedAt: p.updatedAt }));
        return JSON.stringify({ success: true, count: preferences.length, preferences: formattedPreferences });
      }

      case 'delete': {
        if (!key) {
          return JSON.stringify({ error: 'Key is required for delete action' });
        }

        const result = await deletePreference(key);
        if (result.deletedCount === 0) {
          return JSON.stringify({ success: false, message: `No preference found for key "${key}"` });
        }

        return JSON.stringify({ success: true, message: `Preference "${key}" deleted successfully` });
      }

      case 'search': {
        if (!keyword) {
          return JSON.stringify({ error: 'Keyword is required for search action' });
        }

        const preferences = await searchPreferences(keyword);
        if (preferences.length === 0) {
          return JSON.stringify({ success: true, message: `No preferences found matching "${keyword}"`, preferences: [] });
        }

        const formattedPreferences = preferences.map((p) => ({ key: p.key, value: p.value, updatedAt: p.updatedAt }));
        return JSON.stringify({ success: true, count: preferences.length, preferences: formattedPreferences });
      }

      default:
        return JSON.stringify({ error: 'Invalid action' });
    }
  } catch (err) {
    return JSON.stringify({ error: `Failed to ${action} preference: ${err.message}` });
  }
}

export const preferencesTool = tool(runner, {
  name: 'preferences',
  description:
    'Manage preferences and personal information. Save things the user wants you to remember, retrieve preferences when relevant to conversations, list all saved preferences, search for specific preferences, or delete outdated ones. Use this to provide personalized responses based on what you know about the user.',
  schema: preferencesSchema,
});

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { MY_USER_ID } from '@core/config';
import { createMemory, deleteMemory, findMemoryByContent, getMemories, getMemoryById, updateMemory } from '@shared/memories';

const schema = z.object({
  action: z.enum(['remember', 'recall', 'update', 'forget']).describe('The action to perform'),
  content: z.string().optional().describe('The fact to store, written as a short standalone sentence in the language the user used (required for remember and update)'),
  query: z.string().optional().describe('Optional keyword to filter stored facts (recall only); omit to list all facts'),
  memoryId: z.string().optional().describe('The memory ID shown in brackets in the long-term memory list (required for update and forget)'),
});

async function runner({ action, content, query, memoryId }: z.infer<typeof schema>): Promise<string> {
  const chatId = MY_USER_ID;
  try {
    switch (action) {
      case 'remember': {
        if (!content?.trim()) return JSON.stringify({ success: false, error: 'content is required for remember' });
        const existing = await findMemoryByContent(chatId, content);
        if (existing) return JSON.stringify({ success: true, alreadyKnown: true, memoryId: existing._id.toHexString() });
        const memory = await createMemory({ chatId, content });
        return JSON.stringify({ success: true, memoryId: memory._id.toHexString() });
      }
      case 'recall': {
        const keyword = query?.trim().toLowerCase();
        const memories = (await getMemories(chatId)).filter((memory) => !keyword || memory.content.toLowerCase().includes(keyword));
        return JSON.stringify({ success: true, memories: memories.map((memory) => ({ memoryId: memory._id.toHexString(), content: memory.content, updatedAt: memory.updatedAt })) });
      }
      case 'update': {
        if (!memoryId || !content?.trim()) return JSON.stringify({ success: false, error: 'memoryId and content are required for update' });
        const updated = await updateMemory(memoryId, chatId, content);
        return JSON.stringify(updated ? { success: true, memoryId } : { success: false, error: `Memory ${memoryId} not found` });
      }
      case 'forget': {
        if (!memoryId) return JSON.stringify({ success: false, error: 'memoryId is required for forget' });
        const memory = await getMemoryById(memoryId, chatId);
        const deleted = memory ? await deleteMemory(memoryId, chatId) : false;
        return JSON.stringify(deleted ? { success: true, forgotten: memory.content } : { success: false, error: `Memory ${memoryId} not found` });
      }
      default:
        return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to ${action}: ${err.message}` });
  }
}

export const memoryTool = tool(runner, {
  name: 'memory',
  description: `Long-term memory of durable facts about the user that persists across conversations, independent of chat history.

Actions:
- remember: Store a new durable fact (content).
- recall: List stored facts, optionally filtered by a keyword (query). Stored facts are already included in your system prompt, so only use this when you need to search or the list may have been cut off.
- update: Replace an existing fact's text (memoryId + content). Use it when a stored fact changed or was wrong.
- forget: Delete a fact (memoryId). Use it when the user asks you to forget something or a fact is no longer true.

When to remember:
- Proactively save durable facts the user shares about themselves, family, friends, work, health, diet, home, schedule, preferences, and how they want you to behave (e.g. "My wife is vegetarian").
- Also save when the user explicitly asks you to remember something.
- Do NOT save small talk, one-off requests, temporary states, anything already handled by another tool (reminders, calendar events, contacts), or secrets like passwords and card numbers.
- One fact per call, written as a short standalone sentence in the user's language.
- Before saving, check the long-term memory list in your system prompt: if a related fact exists, call update on it instead of creating a duplicate.

After remember/update/forget, briefly mention it in your reply (e.g. "🧠 Saved: ...", "🧠 Updated: ...", "🗑️ Forgot: ..."). The user can view and edit all facts with /memory.`,
  schema,
});

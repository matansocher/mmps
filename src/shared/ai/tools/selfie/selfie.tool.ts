import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getEventsByConversationId, getEventsByDate, getEventsBySenderId, getRecentEvents, searchEvents } from '@shared/selfie';
import type { SelfieEvent } from '@shared/selfie';

const schema = z.object({
  action: z.enum(['recent', 'by_date', 'by_conversation', 'by_sender', 'search']).describe('The query action to perform'),
  date: z.string().optional().describe('Date in YYYY-MM-DD format (required for by_date)'),
  conversationId: z.string().optional().describe('Telegram conversation/chat ID (required for by_conversation)'),
  senderId: z.string().optional().describe('Telegram sender user ID (required for by_sender)'),
  query: z.string().optional().describe('Text search query — case-insensitive regex match on message text (required for search)'),
  limit: z.number().optional().default(50).describe('Max number of results to return (default: 50)'),
});

function formatEvent(event: SelfieEvent) {
  return {
    messageId: event.messageId,
    text: event.text,
    date: event.date instanceof Date ? event.date.toISOString() : event.date,
    isVoice: event.isVoice,
    voiceFileName: event.voiceFileName,
    conversation: event.conversation.title || event.conversation.userName || event.conversation.firstName || event.conversation.id,
    conversationId: event.conversation.id,
    sender: event.sender ? event.sender.firstName || event.sender.userName || event.sender.id : null,
    senderId: event.sender?.id || null,
  };
}

async function runner({ action, date, conversationId, senderId, query, limit = 50 }: z.infer<typeof schema>): Promise<string> {
  try {
    let events: SelfieEvent[];

    switch (action) {
      case 'recent':
        events = await getRecentEvents(limit);
        break;
      case 'by_date':
        if (!date) return JSON.stringify({ success: false, error: 'date is required for by_date action' });
        events = await getEventsByDate(date);
        break;
      case 'by_conversation':
        if (!conversationId) return JSON.stringify({ success: false, error: 'conversationId is required for by_conversation action' });
        events = await getEventsByConversationId(conversationId);
        break;
      case 'by_sender':
        if (!senderId) return JSON.stringify({ success: false, error: 'senderId is required for by_sender action' });
        events = await getEventsBySenderId(senderId);
        break;
      case 'search':
        if (!query) return JSON.stringify({ success: false, error: 'query is required for search action' });
        events = await searchEvents(query, limit);
        break;
      default:
        return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
    }

    return JSON.stringify({
      success: true,
      count: events.length,
      events: events.map(formatEvent),
    });
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to query selfie events: ${err.message}` });
  }
}

export const selfieTool = tool(runner, {
  name: 'telegram_selfie',
  description:
    'Query your personal Telegram message history. Search messages by text, filter by date, conversation, or sender. Use this when the user asks about their Telegram messages, who messaged them, what was said in a conversation, or any question about their Telegram activity.',
  schema,
});

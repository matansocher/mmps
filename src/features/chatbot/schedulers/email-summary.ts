import type { Bot } from 'grammy';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import type { ChatbotService } from '../chatbot.service';

const logger = new Logger('EmailSummaryScheduler');

export async function emailSummary(bot: Bot, chatbotService: ChatbotService): Promise<void> {
  try {
    const prompt = `Create my nightly email summary:

**Unread Emails:**
Use the gmail tool with action "list" to fetch my 10 most recent unread emails (query: "is:unread", maxResults: 10).

**Instructions:**
1. FIRST, filter out advertisement emails:
   - Delete any email that contains the word "advertisement" (in any language) in the subject or body
   - Use the gmail tool with action "delete" to permanently delete these emails
   - Do this filtering step BEFORE presenting the summary
2. If there are no unread emails remaining after filtering, send a brief positive message like "📧 You have no unread emails! Your inbox is clean 🎉"
3. If there are unread emails remaining:
   - Present each email clearly with:
     • Sender (from)
     • Subject
     - Brief snippet (first 50 characters)
     • Email ID (for reference if user wants to act on it)
   - Number the emails (1-10)

**Format:**
- Start with a friendly greeting like "📧 Your Daily Email Summary"
- Use emojis to make it engaging (📧, ✉️, 📨, ⚠️, 💼, 📎)
- Keep suggested actions brief and actionable
- End with an encouraging message
- Use Markdown formatting for readability`;

    const response = await chatbotService.processMessage(prompt, MY_USER_ID);

    if (response?.message) {
      await sendShortenedMessage(bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    await bot.api.sendMessage(MY_USER_ID, '⚠️ Failed to create your email summary.');
    logger.error(`Failed to generate/send email summary: ${err}`);
  }
}

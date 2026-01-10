import type TelegramBot from 'node-telegram-bot-api';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { getDateString } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import type { ChatbotService } from '../chatbot.service';

const logger = new Logger('FootballUpdateEveningScheduler');

export async function footballPredictionsResults(bot: TelegramBot, chatbotService: ChatbotService): Promise<void> {
  try {
    const todayDate = getDateString();

    const prompt = `Generate an evening football update with prediction verification for today (${todayDate}).

IMPORTANT: Look back in our conversation history from earlier today to find the morning predictions you made.

1. Use the match_summary tool to get today's final match results.

2. Review the conversation history to find your morning predictions (the message sent around 13:00 today).
   - Look for predictions with percentages (🏠 X% | 🤝 Y% | 🚌 Z%)
   - Look for the betting odds that were displayed (🏠 X.XX | 🤝 Y.YY | 🚌 Z.ZZ)
   - Identify which matches you predicted

3. For each match you predicted, compare:
   - The betting odds that were available (from morning message)
   - Your predicted outcome (which option had the highest percentage)
   - The actual result
   - How close your prediction was

4. Format the message in English as:
   - Start with "⚽ Today's results and prediction assessment:"
   - For each match that was predicted:
     * Match info and final score
     * Betting odds from morning: "Betting odds: 🏠 X.XX | 🤝 Y.YY | 🚌 Z.ZZ"
     * Your prediction: "I predicted: [outcome] ([percentage]%)"
     * Actual result: "Result: [actual outcome]"
     * Accuracy comment:
       - If correct: "✅ Accurate prediction!" or "🎯 Nailed it!"
       - If close (e.g., predicted draw, ended 1-1): "🤏 Very close!"
       - If wrong: "❌ I was wrong this time" or "😅 Not a good day for predictions"
   - For matches that completed but weren't predicted:
     * Just show the result briefly
   - End with a summary:
     * "Summary: X/Y correct predictions" (if you made predictions)
     * Add a humble/confident note based on accuracy

5. If you didn't make predictions today or cannot find them in history:
   - Just show today's results without the prediction comparison
   - Say "No predictions today, but here are the results:"

Keep it engaging, honest about mistakes, and celebrate successes!`;

    const response = await chatbotService.processMessage(prompt, MY_USER_ID);

    if (response?.message) {
      await sendShortenedMessage(bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    logger.error(`Failed to send evening football update: ${err}`);
  }
}

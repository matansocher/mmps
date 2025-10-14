import type TelegramBot from 'node-telegram-bot-api';
import { Logger } from '@nestjs/common';
import { MY_USER_ID } from '@core/config';
import { getDateString } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import type { ChatbotService } from '../chatbot.service';

const logger = new Logger('FootballPredictionsScheduler');

export async function footballPredictions(bot: TelegramBot, chatbotService: ChatbotService): Promise<void> {
  try {
    const todayDate = getDateString();

    const prompt = `Generate a morning football update with predictions for today (${todayDate}).

1. First, use the top_matches_for_prediction tool to get ALL upcoming matches for today.
   IMPORTANT: The tool now returns ALL matches with league table information where available.

2. Analyze ALL the matches and decide which ones are truly important based on:
   - League prestige (Champions League, Premier League, La Liga, Bundesliga, Serie A, etc.)
   - Team positions in standings (top teams playing, title races)
   - Close matches in the table (teams near each other in standings)
   - Points differences (teams competing for same positions)
   - Relegation battles
   - Derby matches or local rivalries

3. Select the most important matches (typically 3-6 matches, but can be more or less depending on the day).

4. For EACH important match you selected, use the match_prediction_data tool to get prediction data.

5. Analyze the data and provide match predictions with:
   - Home Win / Draw / Away Win percentages (must sum to 100%)
   - **Betting Odds**: Display the actual betting odds from the data (Home / Draw / Away)
   - Brief reasoning (2-3 sentences max per match)
   - Consider betting odds (very valuable!), recent form, and key statistics

Format the message as:
- If important matches found:
  * Start with "⚽ משחקי היום וניבויים:"
  * For each match:
    - Match info: Competition, teams, time
    - Betting Odds: 🏠 X.XX | 🤝 Y.YY | 🚌 Z.ZZ (show the actual odds from the data)
    - Predictions: 🏠 X% | 🤝 Y% | 🚌 Z%
    - Brief analysis (2-3 sentences)
- If no important matches found:
  * Say "אין משחקים חשובים במיוחד היום 🤷‍♂️"
  * You can add a friendly note like "נהנה מהיום!" or similar

Keep it concise and in Hebrew`;

    const response = await chatbotService.processMessage(prompt, MY_USER_ID);

    if (response?.message) {
      await sendShortenedMessage(bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    logger.error(`Failed to send football update: ${err}`);
  }
}

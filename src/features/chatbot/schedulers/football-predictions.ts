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

    const prompt = `Generate a morning football update with predictions and value betting recommendations for today (${todayDate}).

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

6. **VALUE BETTING ANALYSIS** (CRITICAL):
   After generating all predictions, identify VALUE BETS using this logic:

   For each match and each outcome (Home/Draw/Away):
   a) Check if outcome meets BOTH criteria:
      - Your AI prediction probability ≥ 70%
      - Betting odds for that outcome ≥ 1.30

   b) If criteria met, calculate Expected Value (EV):
      - Formula: EV = (AI_probability × betting_odds) - 1
      - Example: AI predicts 75% home win, odds 1.50
        → EV = (0.75 × 1.50) - 1 = 0.125 = +12.5%

   c) Risk Rating:
      - 🟢 Low Risk: AI confidence ≥ 80%
      - 🟡 Medium Risk: AI confidence 70-79%

   d) ONLY show bets with POSITIVE Expected Value (EV > 0)

Format the message as:
**SECTION 1: Regular Predictions**
- Start with "⚽ משחקי היום וניבויים:"
- For each match:
  * Match info: Competition, teams, time
  * Betting Odds: 🏠 X.XX | 🤝 Y.YY | 🚌 Z.ZZ
  * Predictions: 🏠 X% | 🤝 Y% | 🚌 Z%
  * Brief analysis (2-3 sentences)

**SECTION 2: Value Betting Recommendations** (ONLY if value bets exist)
- Add a separator line: "\n---\n"
- Start with "💰 המלצות הימורים - ערך טוב:"
- For EACH value bet:
  * Match info: Competition, teams
  * Recommended outcome (e.g., "המלצה: ניצחון סיטי בבית 🏠")
  * Betting odds: "סיכויים: X.XX"
  * AI confidence: "הניבוי שלי: X%"
  * Expected value: "ערך צפוי: +X% 💰"
  * Risk rating: "דירוג סיכון: 🟢 נמוך" or "🟡 בינוני"
  * Brief reasoning (1-2 sentences explaining why it's a value bet)

- If NO value bets found, do NOT include Section 2 at all

**IMPORTANT NOTES:**
- Thresholds can be adjusted: Currently 70% AI confidence and 1.30 minimum odds
- Expected Value formula is critical for identifying true value
- Only positive EV bets should be recommended
- Risk rating helps users manage their betting strategy
- Keep Hebrew language throughout

If no important matches found:
  * Say "אין משחקים חשובים במיוחד היום 🤷‍♂️"
  * You can add a friendly note like "נהנה מהיום!" or similar

Keep it concise and in Hebrew.

Important: Do NOT include any internal thoughts, reasoning about your process, or meta-commentary (such as "I got all the data I needed", "Now I will address the predictions", etc.) in your final response. Your response should ONLY contain the formatted predictions message for the user, starting directly with "⚽ משחקי היום וניבויים:" or "אין משחקים חשובים במיוחד היום 🤷‍♂️" if there are no matches. This is a user-facing message - skip any internal processing notes.`;

    const response = await chatbotService.processMessage(prompt, MY_USER_ID);

    if (response?.message) {
      await sendShortenedMessage(bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    logger.error(`Failed to send football update: ${err}`);
  }
}

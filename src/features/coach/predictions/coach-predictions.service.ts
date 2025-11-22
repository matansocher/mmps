import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { env } from 'node:process';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { getDateString } from '@core/utils';
import { ANTHROPIC_OPUS_MODEL } from '@services/anthropic/constants';
import { coachPredictionsAgent } from './agent';

export class CoachPredictionsService {
  private readonly logger = new Logger(CoachPredictionsService.name);
  private readonly agent: any;

  constructor() {
    const llm = new ChatAnthropic({
      modelName: ANTHROPIC_OPUS_MODEL,
      temperature: 0.2,
      apiKey: env.ANTHROPIC_API_KEY,
    });

    const checkpointSaver = new MemorySaver();
    this.agent = createReactAgent({
      llm,
      tools: coachPredictionsAgent.tools,
      checkpointSaver,
    });
  }

  async generatePredictions(date: string, competitionIds: number[] = []): Promise<string> {
    try {
      const todayDate = date || getDateString();

      // Build the competition filter text for the prompt
      let competitionFilter = '';
      if (competitionIds && competitionIds.length > 0) {
        competitionFilter = `\n\nIMPORTANT: Filter matches to only include those from these competition IDs: ${competitionIds.join(', ')}`;
      }

      const userPrompt = `Generate a morning football update with predictions and value betting recommendations for today (${todayDate}).

1. First, use the top_matches_for_prediction tool to get ALL upcoming matches for today.${competitionFilter}
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

      const messages = [new SystemMessage(coachPredictionsAgent.prompt), new HumanMessage(userPrompt)];

      const result = await this.agent.invoke(
        { messages },
        {
          configurable: { thread_id: `coach_predictions_${MY_USER_ID}` },
          recursionLimit: 100,
        },
      );

      if (result && result.messages && result.messages.length > 0) {
        const lastMessage = result.messages[result.messages.length - 1];
        return lastMessage.content || null;
      }

      return null;
    } catch (err) {
      this.logger.error(`Error generating predictions: ${err}`);
      return null;
    }
  }

  async generatePredictionsResults(date: string): Promise<string> {
    try {
      const todayDate = date || getDateString();

      const userPrompt = `Generate an evening football update with prediction verification for today (${todayDate}).

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

4. Format the message in Hebrew as:
   - Start with "⚽ תוצאות היום והערכת הניבויים:"
   - For each match that was predicted:
     * Match info and final score
     * Betting odds from morning: "סיכויי ההימורים: 🏠 X.XX | 🤝 Y.YY | 🚌 Z.ZZ"
     * Your prediction: "ניבאתי: [outcome] ([percentage]%)"
     * Actual result: "התוצאה: [actual outcome]"
     * Accuracy comment:
       - If correct: "✅ ניבוי מדויק!" or "🎯 פגעתי במטרה!"
       - If close (e.g., predicted draw, ended 1-1): "🤏 קרוב מאוד!"
       - If wrong: "❌ טעיתי הפעם" or "😅 לא היה יום טוב לניבויים"
   - For matches that completed but weren't predicted:
     * Just show the result briefly
   - End with a summary:
     * "סיכום: X/Y ניבויים נכונים" (if you made predictions)
     * Add a humble/confident note based on accuracy

5. If you didn't make predictions today or cannot find them in history:
   - Just show today's results without the prediction comparison
   - Say "היום לא היו ניבויים, אבל הנה התוצאות:"

IMPORTANT: Respond in Hebrew only. Keep it engaging, honest about mistakes, and celebrate successes!

**CRITICAL INSTRUCTION:**
Do NOT include any internal thoughts, reasoning about your process, or meta-commentary (such as "I found the predictions from earlier", "Let me compare the results", etc.) in your final response. Your response should ONLY contain the formatted results message for the user, starting directly with "⚽ תוצאות היום והערכת הניבויים:" or "היום לא היו ניבויים, אבל הנה התוצאות:" if there were no predictions. This is a user-facing message - skip any internal processing notes.`;

      const messages = [new SystemMessage(coachPredictionsAgent.prompt), new HumanMessage(userPrompt)];

      const result = await this.agent.invoke(
        { messages },
        {
          configurable: { thread_id: `coach_predictions_${MY_USER_ID}` },
          recursionLimit: 100,
        },
      );

      if (result && result.messages && result.messages.length > 0) {
        const lastMessage = result.messages[result.messages.length - 1];
        return lastMessage.content || null;
      }

      return null;
    } catch (err) {
      this.logger.error(`Error generating predictions results: ${err}`);
      return null;
    }
  }
}

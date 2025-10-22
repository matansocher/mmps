import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { env } from 'node:process';
import { Injectable, Logger } from '@nestjs/common';
import { MY_USER_ID } from '@core/config';
import { getDateString } from '@core/utils';
import { ANTHROPIC_OPUS_MODEL } from '@services/anthropic/constants';
import { coachPredictionsAgent } from './agent';

@Injectable()
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

      const userPrompt = `Generate football predictions for today (${todayDate}).

1. Use top_matches_for_prediction to get all upcoming matches for today${competitionFilter}
2. Select the most important matches (3-6 matches typically)
3. For each selected match, use match_prediction_data to get betting odds and statistics
4. Analyze and provide your predictions

IMPORTANT: Respond in Hebrew only.

Format your response as:
⚽ ניבויים למשחקי היום:

For each match:
**[Competition]**
🏠 [Home Team] vs 🚌 [Away Team] - [Time]
סיכויים לפי הימורים: 🏠 X.XX | 🤝 Y.YY | 🚌 Z.ZZ
הניבוי שלי: 🏠 X% | 🤝 Y% | 🚌 Z%
[Brief 2-3 sentence analysis in Hebrew explaining your prediction]

If no important matches: "אין משחקים חשובים במיוחד היום 🤷‍♂️"`;

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

  async generatePredictionsVerification(date: string, competitionIds: number[] = []): Promise<string> {
    try {
      const todayDate = date || getDateString();

      // Build the competition filter text for the prompt
      let competitionFilter = '';
      if (competitionIds && competitionIds.length > 0) {
        competitionFilter = `\n\nIMPORTANT: Focus on matches from these competition IDs: ${competitionIds.join(', ')}`;
      }

      const userPrompt = `Generate an evening football update with prediction verification for today (${todayDate}).

IMPORTANT: Look back in our conversation history from earlier today to find the morning predictions you made.

1. Use the match_summary tool to get today's final match results.

2. Review the conversation history to find your morning predictions (the message sent around 13:00 today).
   - Look for predictions with percentages (🏠 X% | 🤝 Y% | 🚌 Z%)
   - Identify which matches you predicted${competitionFilter}

3. For each match you predicted, compare:
   - Your predicted outcome (which option had the highest percentage)
   - The actual result
   - How close your prediction was

4. Format the message in Hebrew as:
   - Start with "⚽ תוצאות היום והערכת הניבויים:"
   - For each match that was predicted:
     * Match info and final score
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

IMPORTANT: Respond in Hebrew only. Keep it engaging, honest about mistakes, and celebrate successes!`;

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
      this.logger.error(`Error generating prediction verification: ${err}`);
      return null;
    }
  }
}

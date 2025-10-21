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
}

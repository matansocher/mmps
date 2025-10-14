import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { getDateString } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { getTodayExercise } from '@shared/trainer';
import { BOT_CONFIG } from './chatbot.config';
import { ChatbotService } from './chatbot.service';

@Injectable()
export class ChatbotSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(ChatbotSchedulerService.name);

  constructor(
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
    private readonly chatbotService: ChatbotService,
  ) {}

  onModuleInit(): void {
    setTimeout(() => {
      // this.handleDailySummary(); // for testing purposes
      // this.handleFootballUpdate(); // for testing purposes
      // this.handleFootballPredictions(); // for testing purposes
      this.handleImportantGamesCalendar(); // for testing purposes
      // this.handleExerciseReminder(); // for testing purposes
      // this.handleWeeklyExerciseSummary(); // for testing purposes
    }, 8000);
  }

  @Cron(`59 12,23 * * *`, { name: 'chatbot-football-update', timeZone: DEFAULT_TIMEZONE })
  async handleFootballUpdate(): Promise<void> {
    try {
      const prompt = `Generate a midday football update for today (${getDateString()}).
          Use the match_summary tool to get today's match results and ongoing matches. 
          Format the message as:
          - Start with "⚽ המצב הנוכחי של משחקי היום:"
          - Include all matches (completed, ongoing, and upcoming)
          - Use the formatted text from the tool as it contains proper markdown
          - Keep it concise and informative
          - If no matches are found, say "אין משחקים היום"`;

      const response = await this.chatbotService.processMessage(prompt, MY_USER_ID);

      if (response?.message) {
        await sendShortenedMessage(this.bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      this.logger.error(`Failed to send football update: ${err}`);
    }
  }

  @Cron(`00 13 * * *`, { name: 'chatbot-football-predictions', timeZone: DEFAULT_TIMEZONE })
  async handleFootballPredictions(): Promise<void> {
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

      const response = await this.chatbotService.processMessage(prompt, MY_USER_ID);

      if (response?.message) {
        await sendShortenedMessage(this.bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      this.logger.error(`Failed to send football update: ${err}`);
    }
  }

  @Cron(`00 23 * * *`, { name: 'chatbot-daily-summary', timeZone: DEFAULT_TIMEZONE })
  async handleDailySummary(): Promise<void> {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const prompt = `Good evening! Please create my nightly summary with the following information:

1. **Weather Forecast**: Get tomorrow's weather forecast for Kfar Saba (${tomorrow.toISOString().split('T')[0]}) - format as a single line with only the important data (temperature range, rain chance, general conditions).
2. **Calendar**: Check my calendar events for tomorrow. Format as:
   - List each event (just the name and time)
   - If no events, write "- no events"
3. **Exercises**: Mention if I exercised today or not. Keep it brief (1-2 sentences max).
4. **Fun Fact**: End with a fun fact related to todays date or if no something interesting, just a random fun fact.

Please format the response nicely with emojis and make it feel like a friendly good night message. Start with a short warm greeting like "🌙 Good night!" and end with a message encouraging me to prepare for tomorrow's challenges.`;

      const response = await this.chatbotService.processMessage(prompt, MY_USER_ID);

      if (response?.message) {
        await sendShortenedMessage(this.bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      await this.bot.sendMessage(MY_USER_ID, '⚠️ Failed to generate your nightly summary.');
      this.logger.error(`Failed to generate/send daily summary: ${err}`);
    }
  }

  @Cron(`05 13 * * *`, { name: 'chatbot-important-games-calendar', timeZone: DEFAULT_TIMEZONE })
  async handleImportantGamesCalendar(): Promise<void> {
    try {
      const todayDate = getDateString();

      const prompt = `Check today's football matches (${todayDate}) and add very important ones to my calendar.

1. Use the top_matches_for_prediction tool to get ALL upcoming matches for today.

2. Analyze ALL matches and identify the MOST IMPORTANT ones based on:
   - League prestige: Champions League > Isreali premier league > Premier League/La Liga/Bundesliga/Serie A > Other top leagues
   - Team quality: Matches involving top teams (position 1-4 in their league)
   - Title races: Top teams within 5 points of each other
   - Relegation battles: Bottom 4 teams playing against each other
   - Table proximity: Teams within 3 positions of each other with less than 6 points difference
   - Derby significance: Teams very close in the table (within 2 positions)

3. Select ONLY the truly important matches (typically 1-3 matches per day, could be 0 if no important matches).
   A match should be considered "very important" if it meets at least 2 of the above criteria.

4. For each important match, use the calendar tool to create an event:
   - title: "⚽ [Home Team] vs [Away Team]" (in English)
   - description: Include league name and why it's important (1 sentence)
   - startDateTime and endDateTime: Use the match's actual start time, add 2 hours for end time
   - location: The venue from the match data

5. After creating calendar events, send me a summary message in Hebrew:
   - If events were created: "✅ הוספתי [X] משחק/ים חשובים ללוח השנה:" followed by the list
   - If no important matches: "אין משחקים חשובים במיוחד היום 🤷‍♂️"

Keep the message concise and in Hebrew.`;

      const response = await this.chatbotService.processMessage(prompt, MY_USER_ID);

      if (response?.message) {
        await sendShortenedMessage(this.bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      this.logger.error(`Failed to add important games to calendar: ${err}`);
    }
  }

  @Cron(`0 19 * * *`, { name: 'chatbot-exercise-reminder', timeZone: DEFAULT_TIMEZONE })
  async handleExerciseReminder(): Promise<void> {
    try {
      const todayExercise = await getTodayExercise(MY_USER_ID);
      if (todayExercise) {
        return;
      }

      const prompt = `Generate a motivational exercise reminder for me. I haven't exercised today yet.
      Use the exercise_analytics tool with action "generate_reminder" to get a motivational meme if available.
      Keep the message short, fun, and encouraging. Use emojis to make it engaging.
      If a meme URL is available, send it along with a short motivational message.`;

      const response = await this.chatbotService.processMessage(prompt, MY_USER_ID);

      if (response?.message) {
        await this.bot.sendMessage(MY_USER_ID, response.message, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      this.logger.error(`Failed to send exercise reminder: ${err}`);
    }
  }

  @Cron(`0 22 * * 6`, { name: 'chatbot-weekly-exercise-summary', timeZone: DEFAULT_TIMEZONE })
  async handleWeeklyExerciseSummary(): Promise<void> {
    try {
      const prompt = `Generate my weekly exercise summary.
      Use the exercise_analytics tool with action "weekly_summary" to get my weekly stats.
      Format the response with:
      - Last week's exercise days (show which days I exercised)
      - Weekly rating with stars
      - Current streak and longest streak
      - Encouraging message for the upcoming week
      Use emojis to make it engaging and motivational.`;

      const response = await this.chatbotService.processMessage(prompt, MY_USER_ID);

      if (response?.message) {
        await this.bot.sendMessage(MY_USER_ID, response.message, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      this.logger.error(`Failed to send weekly exercise summary: ${err}`);
    }
  }
}

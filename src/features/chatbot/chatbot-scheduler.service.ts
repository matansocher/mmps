import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { getDateString } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { getActiveSubscriptions } from '../coach/mongo';
import { getTodayExercise } from '@shared/domains/exercise/mongo';
import { SMART_REMINDER_HOUR_OF_DAY, WEEKLY_SUMMARY_HOUR_OF_DAY } from '../trainer/trainer.config';
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
      // this.handleExerciseReminder(); // for testing purposes
      // this.handleWeeklyExerciseSummary(); // for testing purposes
    }, 8000);
  }

  @Cron(`59 12,23 * * *`, { name: 'chatbot-football-update', timeZone: DEFAULT_TIMEZONE })
  async handleFootballUpdate(): Promise<void> {
    try {
      // Get all active coach subscriptions
      const activeSubscriptions = await getActiveSubscriptions();
      if (!activeSubscriptions?.length) {
        return;
      }

      const todayDate = getDateString();

      for (const subscription of activeSubscriptions) {
        try {
          const { chatId, customLeagues } = subscription;

          // Build prompt based on custom leagues
          let prompt = `Generate a midday football update for today (${todayDate}). `;

          if (customLeagues?.length) {
            prompt += `Focus only on the leagues with IDs: ${customLeagues.join(', ')}. `;
          }

          prompt += `Use the match_summary tool to get today's match results and ongoing matches. 
          Format the message as:
          - Start with "⚽ המצב הנוכחי של משחקי היום:"
          - Include all matches (completed, ongoing, and upcoming)
          - Use the formatted text from the tool as it contains proper markdown
          - Keep it concise and informative
          - If no matches are found, say "אין משחקים היום"`;

          const response = await this.chatbotService.processMessage(prompt, chatId);

          if (response?.message) {
            await sendShortenedMessage(this.bot, chatId, response.message, { parse_mode: 'Markdown' });
          }
        } catch (err) {
          this.logger.error(`Failed to send midday football update to ${subscription.chatId}: ${err}`);
        }
      }
    } catch (err) {
      this.logger.error(`Failed to handle midday football update: ${err}`);
    }
  }

  @Cron(`00 23 * * *`, { name: 'chatbot-daily-summary', timeZone: DEFAULT_TIMEZONE })
  async handleDailySummary(): Promise<void> {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const prompt = `Good evening! Please create my nightly summary with the following information:

1. **Weather Forecast**: Get tomorrow's weather forecast for Kfar Saba (${tomorrow.toISOString().split('T')[0]})
2. **Calendar**: Check my calendar events for tomorrow. if you see any special events, address them.
4. **Exercises**: Mention if I exercised today or not. If I did, congratulate me and provide a fun motivational message. If I didn't, encourage me to exercise tomorrow with a motivational message.
5. **Fun Face**: End with a fun fact related to todays date or if no something interesting, just a random fun fact.

Please format the response nicely with emojis and make it feel like a friendly good night message. Start with a warm greeting like "🌙 Good night!" and wish me sweet dreams at the end.`;

      const response = await this.chatbotService.processMessage(prompt, MY_USER_ID);

      if (response?.message) {
        await sendShortenedMessage(this.bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      await this.bot.sendMessage(MY_USER_ID, '⚠️ Failed to generate your nightly summary.');
      this.logger.error(`Failed to generate/send daily summary: ${err}`);
    }
  }

  @Cron(`59 23 * * *`, { name: 'chatbot-evening-football', timeZone: DEFAULT_TIMEZONE })
  async handleEveningFootballUpdate(): Promise<void> {
    try {
      const activeSubscriptions = await getActiveSubscriptions();
      if (!activeSubscriptions?.length) {
        return;
      }

      const todayDate = getDateString();

      for (const subscription of activeSubscriptions) {
        try {
          const { chatId, customLeagues } = subscription;

          // Skip MY_USER_ID as they get it in the daily summary
          if (chatId === MY_USER_ID) {
            continue;
          }

          // Build prompt based on custom leagues
          let prompt = `Generate an evening football summary for today (${todayDate}). `;

          if (customLeagues?.length) {
            prompt += `Focus only on the leagues with IDs: ${customLeagues.join(', ')}. `;
          }

          prompt += `Use the match_summary tool to get today's match results. 
          Format the message as:
          - Start with "⚽ זה המצב הנוכחי של משחקי היום:"
          - Include all match results from today
          - Use the formatted text from the tool as it contains proper markdown
          - Keep it concise and informative
          - If no matches are found, say "אין משחקים היום"`;

          const response = await this.chatbotService.processMessage(prompt, chatId);

          if (response?.message) {
            await sendShortenedMessage(this.bot, chatId, response.message, { parse_mode: 'Markdown' });
          }
        } catch (err) {
          this.logger.error(`Failed to send evening football update to ${subscription.chatId}: ${err}`);
        }
      }
    } catch (err) {
      this.logger.error(`Failed to handle evening football update: ${err}`);
    }
  }

  @Cron(`0 ${SMART_REMINDER_HOUR_OF_DAY} * * *`, { name: 'chatbot-exercise-reminder', timeZone: DEFAULT_TIMEZONE })
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

  @Cron(`0 ${WEEKLY_SUMMARY_HOUR_OF_DAY} * * 6`, { name: 'chatbot-weekly-exercise-summary', timeZone: DEFAULT_TIMEZONE })
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

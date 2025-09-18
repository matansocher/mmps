import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { sendShortenedMessage } from '@services/telegram';
import { getTodayExercise } from '../trainer/mongo';
import { SMART_REMINDER_HOUR_OF_DAY, WEEKLY_SUMMARY_HOUR_OF_DAY } from '../trainer/trainer.config';
import { BOT_CONFIG } from './chatbot.config';
import { ChatbotService } from './chatbot.service';

const SUMMARY_HOUR = 23;

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
      // this.handleExerciseReminder(); // for testing purposes
      // this.handleWeeklyExerciseSummary(); // for testing purposes
    }, 8000);
  }

  @Cron(`0 ${SUMMARY_HOUR} * * *`, { name: 'chatbot-daily-summary', timeZone: DEFAULT_TIMEZONE })
  async handleDailySummary(): Promise<void> {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const prompt = `Good evening! Please create my nightly summary with the following information:

1. **Weather Forecast**: Get tomorrow's weather forecast for Kfar Saba (${tomorrow.toISOString().split('T')[0]})
2. **Calendar**: Check my calendar events for tomorrow. if you see any special events, address them.
3. **Football**: Get today's football match results from every league you know
4. **Exercises**: Mention if I exercised today or not. If I did, congratulate me and provide a fun motivational message. If I didn't, encourage me to exercise tomorrow with a motivational message.
5. **Fun Face**: End with a fun fact related to todays date or if no something interesting, just a random fun fact.

Please format the response nicely with emojis and make it feel like a friendly good night message. Start with a warm greeting like "🌙 Good night!" and wish me sweet dreams at the end.`;

      const response = await this.chatbotService.processMessage(prompt, MY_USER_ID.toString());

      if (response?.message) {
        await sendShortenedMessage(this.bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      await this.bot.sendMessage(MY_USER_ID, '⚠️ Failed to generate your nightly summary.');
      this.logger.error(`Failed to generate/send daily summary: ${err}`);
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

      const response = await this.chatbotService.processMessage(prompt, MY_USER_ID.toString());

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

      const response = await this.chatbotService.processMessage(prompt, MY_USER_ID.toString());

      if (response?.message) {
        await this.bot.sendMessage(MY_USER_ID, response.message, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      this.logger.error(`Failed to send weekly exercise summary: ${err}`);
    }
  }
}
